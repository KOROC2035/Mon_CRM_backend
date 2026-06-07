from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

# Définition stricte des statuts possibles pour éviter les erreurs de frappe
class LeadStatus(str, Enum):
    A_CONTACTER = "À contacter"
    APPELE = "Appelé"
    SUIVI = "Suivi à faire"
    REJETE = "Rejeté"
    # Nouveaux statuts tactiques pour LinkedIn
    DM_ENVOYE = "DM Envoyé"
    REPONSE_RECUE = "Réponse Reçue"
    APPEL_RESERVE = "Appel Réservé"

# La base commune à toutes les requêtes
class ProspectBase(BaseModel):
    entreprise: str = Field(..., description="Nom de l'entreprise cible")
    nom_contact: str = Field(..., description="Nom du décideur")
    secteur: str = Field(..., description="Ex: Immobilier, Marketing, etc.")
    
    # Éléments de l'audit
    outils_actuels: Optional[str] = Field(None, description="Outils utilisés actuellement")
    temps_perdu: Optional[str] = Field(None, description="Tâches manuelles répétitives")
    point_de_douleur: Optional[str] = Field(None, description="Impact sur le chiffre d'affaires ou l'efficacité")
    
    statut: LeadStatus = LeadStatus.A_CONTACTER
    notes_brutes: Optional[str] = Field(None, description="Citations exactes et observations")
    date_appel: Optional[datetime] = None
    date_contact: Optional[datetime] = None

# Schéma utilisé lors de la création initiale (avant l'appel)
class ProspectCreate(ProspectBase):
    pass

# Schéma utilisé pour mettre à jour la fiche (pendant ou après l'appel)
# Tous les champs sont optionnels pour ne modifier que ce qui est nécessaire
class ProspectUpdate(BaseModel):
    statut: Optional[LeadStatus] = None
    outils_actuels: Optional[str] = None
    temps_perdu: Optional[str] = None
    point_de_douleur: Optional[str] = None
    notes_brutes: Optional[str] = None
    date_appel: Optional[datetime] = None
    date_contact: Optional[datetime] = None

# Schéma renvoyé par l'API (inclut l'ID généré par PostgreSQL et la date)
class ProspectDB(ProspectBase):
    id: int
    date_ajout: datetime

    class Config:
        # Permet à Pydantic de lire les modèles SQLAlchemy
        from_attributes = True