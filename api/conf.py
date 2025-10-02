import os

class Config:
    # Webuntis Username, Passwort,
    USERNAME = os.getenv("USERNAME", "") 
    PASSWORD = os.getenv("PASSWORD", "")
    SCHOOL = os.getenv("SCHOOL", "") # zb. "BBS III Magdeburg"
    SERVER = os.getenv("SERVER", "") # "tipo.webuntis.com" für BBS III Magdeburg
    MYCLASS = os.getenv("MYCLASS", "")