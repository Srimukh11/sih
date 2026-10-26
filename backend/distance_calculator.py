"""
Distance Estimation from RSSI using Log-Distance Path Loss (LDPL) Model

Formulas:
- RSSI(d) = RSSI(d0) - 10*n*log10(d/d0)
- d = d0 * 10^((RSSI(d0) - RSSI(d)) / (10*n))

Where:
- n = path loss exponent (2.0 free space, 2.7-4.0 indoors/urban)
- d0 = reference distance (typically 1m)
- RSSI(d0) = measured signal strength at reference distance
"""

import math
from typing import Tuple

def rssi_to_distance_m(
    rssi_dbm: float,
    rssi_ref_dbm_at_1m: float = -40.0,
    n: float = 2.7,
    d0_m: float = 1.0,
) -> float:
    """
    Estimate distance from RSSI using Log-Distance Path Loss model.
    
    Args:
        rssi_dbm: Measured RSSI in dBm
        rssi_ref_dbm_at_1m: Calibrated RSSI at reference distance
        n: Path loss exponent (environment-dependent)
        d0_m: Reference distance in meters
        
    Returns:
        Estimated distance in meters
        
    Example:
        >>> rssi_to_distance_m(-92.0, -40.0, 2.7, 1.0)
        79.43  # ~79 meters
    """
    # Clamp to prevent negative/zero distances
    if rssi_dbm > rssi_ref_dbm_at_1m:
        return d0_m
    
    # d = d0 * 10^((RSSI_ref - RSSI) / (10*n))
    distance = d0_m * (10 ** ((rssi_ref_dbm_at_1m - rssi_dbm) / (10.0 * n)))
    
    return max(distance, d0_m)


def rssi_sigma_to_distance_sigma(
    rssi_sigma_db: float,
    n: float,
    distance_m: float
) -> float:
    """
    Propagate RSSI variance to distance uncertainty (first-order approximation).
    
    Args:
        rssi_sigma_db: Standard deviation of RSSI in dB
        n: Path loss exponent
        distance_m: Current estimated distance
        
    Returns:
        Distance uncertainty in meters
        
    Formula:
        σ_d ≈ d * ln(10) / (10*n) * σ_rssi
    """
    # Derivative of distance w.r.t. RSSI: d*ln(10)/(10*n)
    uncertainty = distance_m * math.log(10) / (10.0 * n) * abs(rssi_sigma_db)
    return uncertainty


def calibrate_path_loss_exponent(
    measurements: list[Tuple[float, float]]
) -> Tuple[float, float]:
    """
    Calibrate path loss exponent from multiple distance/RSSI measurements.
    
    Args:
        measurements: List of (distance_m, rssi_dbm) tuples
        
    Returns:
        Tuple of (n, rssi_at_1m)
        
    Example:
        >>> measurements = [(2, -45), (10, -70), (30, -85), (60, -95)]
        >>> n, rssi_1m = calibrate_path_loss_exponent(measurements)
        >>> print(f"Path loss exponent: {n:.2f}")
        >>> print(f"RSSI at 1m: {rssi_1m:.1f} dBm")
    """
    if len(measurements) < 2:
        raise ValueError("Need at least 2 calibration measurements")
    
    # Linear regression: RSSI = RSSI(1m) - 10*n*log10(d)
    # y = mx + b where y=RSSI, x=log10(d), m=-10n, b=RSSI(1m)
    
    import numpy as np
    
    distances = np.array([m[0] for m in measurements])
    rssi_values = np.array([m[1] for m in measurements])
    
    log_distances = np.log10(distances)
    
    # Fit linear model
    coeffs = np.polyfit(log_distances, rssi_values, 1)
    slope = coeffs[0]  # -10*n
    intercept = coeffs[1]  # RSSI at 1m
    
    n = -slope / 10.0
    rssi_at_1m = intercept
    
    return n, rssi_at_1m


def estimate_distance_with_confidence(
    rssi_dbm: float,
    rssi_history: list[float],
    rssi_ref_dbm_at_1m: float = -40.0,
    n: float = 2.7,
    d0_m: float = 1.0,
) -> Tuple[float, float]:
    """
    Estimate distance and uncertainty from current RSSI and historical variance.
    
    Args:
        rssi_dbm: Current RSSI measurement
        rssi_history: Recent RSSI measurements for variance calculation
        rssi_ref_dbm_at_1m: Calibrated reference RSSI
        n: Path loss exponent
        d0_m: Reference distance
        
    Returns:
        Tuple of (distance_m, uncertainty_m)
    """
    import numpy as np
    
    # Calculate distance from current RSSI
    distance = rssi_to_distance_m(rssi_dbm, rssi_ref_dbm_at_1m, n, d0_m)
    
    # Calculate RSSI variance from history
    if len(rssi_history) >= 3:
        rssi_std = float(np.std(rssi_history))
    else:
        rssi_std = 3.0  # Default uncertainty
    
    # Propagate to distance uncertainty
    uncertainty = rssi_sigma_to_distance_sigma(rssi_std, n, distance)
    
    return distance, uncertainty
