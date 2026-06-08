from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import models
from database import engine, get_db
from schemas import ProspectCreate, ProspectDB, ProspectUpdate # Tes schémas Pydantic

# Création des tables (pour la prod, Alembic sera préférable)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Shadow CRM API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://mon-crm-frontend.vercel.app"], # En production, on mettra l'URL exacte du frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/prospects/", response_model=ProspectDB, status_code=201)
def create_prospect(prospect: ProspectCreate, db: Session = Depends(get_db)):
    db_prospect = models.Prospect(**prospect.model_dump())
    db.add(db_prospect)
    db.commit()
    db.refresh(db_prospect)
    return db_prospect

@app.get("/prospects/", response_model=List[ProspectDB])
def read_prospects(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    prospects = db.query(models.Prospect).order_by(models.Prospect.date_ajout.desc()).offset(skip).limit(limit).all()
    return prospects

@app.patch("/prospects/{prospect_id}", response_model=ProspectDB)
def update_prospect_status(prospect_id: int, prospect_update: ProspectUpdate, db: Session = Depends(get_db)):
    db_prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not db_prospect:
        raise HTTPException(status_code=404, detail="Cible non trouvée")
    
    update_data = prospect_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_prospect, key, value)
        
    db.commit()
    db.refresh(db_prospect)
    return db_prospect

@app.delete("/prospects/{prospect_id}", status_code=204)
def delete_prospect(prospect_id: int, db: Session = Depends(get_db)):
    db_prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not db_prospect:
        raise HTTPException(status_code=404, detail="Cible non trouvée")
    
    db.delete(db_prospect)
    db.commit()
    return None # Le statut 204 ne renvoie aucun contenu