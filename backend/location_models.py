"""
Location Models for Pipeline Sensor Tracking
Supports distance estimation via RSSI and fixed positioning
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

NodeStatus = Literal["absent", "normal", "fault", "offline"]

class Node(BaseModel):
    """Represents a sensor node along a pipeline"""
    node_id: int
    name: str
    fixed_distance_m: float  # Authoritative position from physical installation
    status: NodeStatus = "absent"
    last_rssi: Optional[float] = None
    last_snr: Optional[float] = None
    rssi_avg: Optional[float] = None
    distance_est_m: Optional[float] = None  # RSSI-based estimation
    distance_uncertainty_m: Optional[float] = None  # Confidence radius
    last_seen: Optional[datetime] = None
    sensor_type: Optional[str] = None  # "gas", "water_flow", "water_level", etc.

class Pipeline(BaseModel):
    """Represents a utility pipeline (water, gas, power, data)"""
    pipeline_id: str  # "water" | "gas" | "power" | "data"
    name: str
    path_loss_n: float = 2.7  # Path loss exponent (calibrated per pipeline)
    rssi_ref_dbm_at_1m: float = -40.0  # Reference RSSI at 1m (calibrate)
    d0_m: float = 1.0  # Reference distance
    nodes: List[Node] = Field(default_factory=list)

class Health(BaseModel):
    """System health status"""
    tx_online: bool
    rx_online: bool
    mqtt_online: bool
    ws_online: bool
    backend_online: bool = True
    last_tx_seen: Optional[datetime] = None
    last_rx_seen: Optional[datetime] = None
    last_mqtt_msg: Optional[datetime] = None
