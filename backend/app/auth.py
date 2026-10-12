"""Local account sessions. Raw tokens and passwords never enter the database."""
import hashlib
import hmac
import re
import secrets
import uuid
from datetime import timedelta, timezone
from sqlalchemy.exc import IntegrityError
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from .database import Account, LoginSession, Preference, get_db, now

router = APIRouter(prefix='/api/v1/auth', tags=['Accounts'])
attempts = {}

def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()

def password_hash(password):
    salt=secrets.token_bytes(16)
    key=hashlib.scrypt(password.encode(),salt=salt,n=16384,r=8,p=1,dklen=32)
    return 'scrypt$'+salt.hex()+'$'+key.hex()

def password_matches(password,encoded):
    try:
        _,salt,key=encoded.split('$')
        actual=hashlib.scrypt(password.encode(),salt=bytes.fromhex(salt),n=16384,r=8,p=1,dklen=32)
        return hmac.compare_digest(actual,bytes.fromhex(key))
    except (ValueError,TypeError):
        return False

def email_value(value):
    value=value.strip().lower()
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',value):
        raise HTTPException(422,'Enter a valid email address.')
    return value

def throttle(request):
    import time
    device=request.headers.get('x-device-id','')
    current=time.monotonic()
    values=[v for v in attempts.get(device,[]) if v>current-300]
    if len(values)>=20:
        raise HTTPException(429,'Too many attempts. Wait five minutes and try again.')
    attempts[device]=values+[current]

def session_account(db,request):
    token=request.headers.get('x-local-session','')
    if not token:
        return None
    session=db.get(LoginSession,digest(token))
    if not session:
        return None
    expiry=session.expires_at.replace(tzinfo=timezone.utc) if session.expires_at.tzinfo is None else session.expires_at
    return db.get(Account,session.account_id) if expiry>now() else None

def public_account(account):
    return {'id':account.id,'email':account.email,'name':account.name,'provider':'local'}

def issue_session(db,account):
    token=secrets.token_urlsafe(48)
    expiry=now()+timedelta(days=7)
    db.add(LoginSession(token_hash=digest(token),account_id=account.id,expires_at=expiry))
    db.commit()
    return {'account':public_account(account),'session_token':token,'expires_in':7*24*3600}

class Signup(BaseModel):
    name:str=Field(min_length=1,max_length=80)
    email:str=Field(max_length=254)
    password:str=Field(min_length=10,max_length=128)

class Login(BaseModel):
    email:str=Field(max_length=254)
    password:str=Field(min_length=1,max_length=128)

class Recovery(BaseModel):
    email:str=Field(max_length=254)
    recovery_code:str=Field(min_length=10,max_length=128)
    password:str=Field(min_length=10,max_length=128)

@router.post('/signup')
def signup(payload:Signup,request:Request,db=Depends(get_db)):
    throttle(request)
    email=email_value(payload.email)
    recovery=secrets.token_urlsafe(24)
    account=Account(id=str(uuid.uuid4()),email=email,name=payload.name.strip(),password_hash=password_hash(payload.password),recovery_hash=digest(recovery))
    if not account.name:
        raise HTTPException(422,'Enter your name.')
    db.add(account)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409,'An account already uses this email. Sign in or recover access.')
    return {**issue_session(db,account),'recovery_code':recovery}

@router.post('/login')
def login(payload:Login,request:Request,db=Depends(get_db)):
    throttle(request)
    account=db.query(Account).filter_by(email=email_value(payload.email)).first()
    # Equal-cost verification even for missing accounts.
    encoded=account.password_hash if account else 'scrypt$'+'00'*16+'$'+'00'*32
    if not password_matches(payload.password,encoded) or not account:
        raise HTTPException(401,'Email or password is incorrect.')
    return issue_session(db,account)

@router.get('/me')
def me(request:Request,db=Depends(get_db)):
    account=session_account(db,request)
    return {'account':public_account(account) if account else None}

@router.post('/logout')
def logout(request:Request,db=Depends(get_db)):
    token=request.headers.get('x-local-session','')
    if token:
        db.query(LoginSession).filter_by(token_hash=digest(token)).delete()
        db.commit()
    return {'signed_out':True}

@router.post('/recover')
def recover(payload:Recovery,request:Request,db=Depends(get_db)):
    throttle(request)
    account=db.query(Account).filter_by(email=email_value(payload.email)).first()
    if not account or not hmac.compare_digest(account.recovery_hash,digest(payload.recovery_code)):
        raise HTTPException(401,'The email and recovery code could not be verified.')
    next_code=secrets.token_urlsafe(24)
    account.password_hash=password_hash(payload.password)
    account.recovery_hash=digest(next_code)
    db.query(LoginSession).filter_by(account_id=account.id).delete()
    db.commit()
    return {**issue_session(db,account),'recovery_code':next_code}
