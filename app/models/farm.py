from typing import List, Literal, Union, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class GeoJSONPolygon(BaseModel):
    type: Literal["Polygon"] = "Polygon"
    coordinates: List[List[List[float]]] = Field(
        ...,
        description="Coordenadas del polígono en formato GeoJSON [[[lng, lat], [lng, lat], ...]]"
    )

    @field_validator("coordinates")
    @classmethod
    def validate_coordinates(cls, coords: List[List[List[float]]]) -> List[List[List[float]]]:
        if not coords or len(coords) == 0:
            raise ValueError("El polígono debe tener al menos un anillo lineal exterior.")
        
        exterior_ring = coords[0]
        if len(exterior_ring) < 4:
            raise ValueError("El anillo lineal exterior debe tener al menos 4 puntos para cerrarse.")
        
        # Validar coordenadas numéricas y rangos de latitud/longitud
        for pt in exterior_ring:
            if len(pt) < 2:
                raise ValueError(f"Coordenada inválida: {pt}. Debe contener al menos [longitud, latitud].")
            lng, lat = pt[0], pt[1]
            if not (-180 <= lng <= 180):
                raise ValueError(f"Longitud fuera de rango (-180 a 180): {lng}")
            if not (-90 <= lat <= 90):
                raise ValueError(f"Latitud fuera de rango (-90 a 90): {lat}")
        
        # Validar que el polígono esté cerrado (primer punto == último punto)
        if exterior_ring[0] != exterior_ring[-1]:
            # Auto-cerrar si está muy cercano o añadir el primer punto al final
            exterior_ring.append(exterior_ring[0])

        return coords


class FarmCreate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=150, description="Nombre de la granja o predio agrícola")
    geojson: Union[GeoJSONPolygon, Dict[str, Any]] = Field(
        ...,
        description="Geometría GeoJSON del polígono de la granja"
    )

    @field_validator("geojson")
    @classmethod
    def validate_geojson_structure(cls, v: Union[GeoJSONPolygon, Dict[str, Any]]) -> Dict[str, Any]:
        if isinstance(v, GeoJSONPolygon):
            return v.model_dump()
        
        # Si es un GeoJSON Feature
        if isinstance(v, dict):
            if v.get("type") == "Feature" and "geometry" in v:
                geometry = v["geometry"]
            elif v.get("type") == "Polygon":
                geometry = v
            else:
                raise ValueError("El GeoJSON debe ser de tipo 'Polygon' o 'Feature' con geometría 'Polygon'.")
            
            # Validar con GeoJSONPolygon
            validated_polygon = GeoJSONPolygon(**geometry)
            return validated_polygon.model_dump()
        
        raise ValueError("Estructura GeoJSON inválida.")


class FarmResponse(BaseModel):
    farmId: str = Field(..., description="ID único de la granja")
    nombre: str = Field(..., description="Nombre de la granja")
    geojson: Dict[str, Any] = Field(..., description="Geometría GeoJSON del polígono")
    fechaCreacion: str = Field(..., description="Fecha y hora de registro en formato ISO 8601")
