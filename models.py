from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
from database import Base

class Prospect(Base):
    __tablename__ = "prospects"

    id = Column(Integer, primary_key=True, index=True)
    entreprise = Column(String, index=True, nullable=False)
    nom_contact = Column(String, nullable=False)
    secteur = Column(String, index=True, nullable=False)
    
    # Matrice d'audit
    outils_actuels = Column(String, nullable=True)
    temps_perdu = Column(String, nullable=True)
    point_de_douleur = Column(String, nullable=True)
    
    # Suivi stratégique
    statut = Column(String, default="À contacter", index=True)
    notes_brutes = Column(Text, nullable=True)
    
    date_ajout = Column(DateTime, default=datetime.utcnow)
    date_appel = Column(DateTime, nullable=True)
    date_contact = Column(DateTime, nullable=True)