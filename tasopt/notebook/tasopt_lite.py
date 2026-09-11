"""
TASOPT-lite: a reduced-order Python port of the sizing loop described in
Drela's TASOPT 2.00 Technical Description. Standalone test script -- this
gets folded into notebook cells afterward.
"""
import numpy as np

# ----------------------------------------------------------------------
# Constants
# ----------------------------------------------------------------------
g = 9.80665
R_air = 287.05
gamma_c = 1.40
gamma_h = 1.33
cp_c = gamma_c * R_air / (gamma_c - 1.0)      # ~1004.7 J/kg-K, cold-side air
R_h = 287.0
cp_h = gamma_h * R_h / (gamma_h - 1.0)        # ~1156.7 J/kg-K, hot combustion gas
h_fuel = 43.0e6                                # J/kg, jet fuel LHV

# ----------------------------------------------------------------------
# ISA atmosphere
# ----------------------------------------------------------------------
def isa(h_m):
    T0, p0, lapse = 288.15, 101325.0, 0.0065
    if h_m <= 11000.0:
        T = T0 - lapse * h_m
        p = p0 * (T / T0) ** (g / (lapse * R_air))
    else:
        T11 = T0 - lapse * 11000.0
        p11 = p0 * (T11 / T0) ** (g / (lapse * R_air))
        T = T11
        p = p11 * np.exp(-g * (h_m - 11000.0) / (R_air * T11))
    rho = p / (R_air * T)
    a = np.sqrt(gamma_c * R_air * T)
    return T, p, rho, a


def sutherland_mu(T):
    return 1.458e-6 * T ** 1.5 / (T + 110.4)


# ----------------------------------------------------------------------
# Aircraft definition (737-800-class baseline)
# ----------------------------------------------------------------------
from dataclasses import dataclass, field


@dataclass
class Geometry:
    R_fuse: float = 1.955
    l_fuse: float = 39.5
    l_cabin: float = 29.0
    AR: float = 9.45
    sweep_deg: float = 25.0
    tc: float = 0.12
    taper: float = 0.24
    Sh_frac: float = 0.28
    Sv_frac: float = 0.20


@dataclass
class MissionSpec:
    n_pax: int = 162
    mass_per_pax: float = 102.0
    range_target_km: float = 5000.0
    cruise_mach: float = 0.785
    cruise_alt_m: float = 11000.0
    reserve_frac: float = 0.06
    CL_cruise: float = 0.55


@dataclass
class EngineSpec:
    n_eng: int = 2
    BPR: float = 5.1
    OPR: float = 32.0
    T4: float = 1450.0
    pi_f: float = 1.70
    pi_d: float = 0.99
    pi_b: float = 0.96
    eta_f: float = 0.90
    eta_c: float = 0.87
    eta_t: float = 0.90
    eta_b: float = 0.99
    eta_n: float = 0.98
    cruise_thrust_lapse: float = 0.22


@dataclass
class Materials:
    rho_al: float = 2700.0
    sigma_skin: float = 103.0e6
    sigma_cap: float = 262.0e6
    delta_p: float = 57.0e3
    f_string: float = 0.35
    f_frame: float = 0.25
    f_fadd: float = 0.20
    f_bend: float = 0.10
    N_ult: float = 3.75


geom = Geometry()
mission = MissionSpec()
eng = EngineSpec()
mats = Materials()
m_pay = mission.n_pax * mission.mass_per_pax
print(f"Design payload: {m_pay:,.0f} kg")

# ----------------------------------------------------------------------
# Fuselage structural weight  (Eq. A.14-A.16, A.28-A.32, A.38-A.49)
# ----------------------------------------------------------------------
def fuselage_mass(geom: Geometry, mats: Materials, m_pay: float):
    t_skin = mats.delta_p * geom.R_fuse / mats.sigma_skin                 # Eq. A.16
    A_skin = 2 * np.pi * geom.R_fuse * t_skin                             # Eq. A.11 (single-bubble case)
    m_skin = mats.rho_al * A_skin * geom.l_fuse * (1 + mats.f_string + mats.f_frame + mats.f_fadd)  # Eq. A.28-A.32
    m_shell = m_skin * (1 + mats.f_bend)                                  # simplified stand-in for Eq. A.79-A.113
    m_tailcone = 0.05 * m_shell                                           # simplified stand-in for Eq. A.61-A.69

    floor_areal = 9.0          # kg/m^2, structure + planking, cf. Eq. A.50-A.60
    m_floor = floor_areal * (2 * geom.R_fuse * geom.l_cabin)

    window_perlen = 3.5        # kg/m, Eq. A.38
    insul_areal = 0.9          # kg/m^2, Eq. A.40
    m_window = window_perlen * geom.l_cabin
    m_insul = insul_areal * (2 * np.pi * geom.R_fuse * geom.l_cabin * 1.1)

    f_apu, f_seat, f_padd = 0.04, 0.10, 0.34       # Eq. A.42, A.44, A.46 (fractions of payload)
    m_apu = f_apu * m_pay
    m_seat = f_seat * m_pay
    m_padd = f_padd * m_pay
    m_fix = 500.0               # Eq. A.48, fixed avionics/cockpit/crew weight

    m_total = (m_shell + m_tailcone + m_floor + m_window + m_insul
               + m_apu + m_seat + m_padd + m_fix)
    detail = dict(t_skin_mm=t_skin * 1e3, m_shell=m_shell, m_floor=m_floor,
                  m_window=m_window, m_insul=m_insul, m_apu=m_apu,
                  m_seat=m_seat, m_padd=m_padd, m_fix=m_fix, m_tailcone=m_tailcone)
    return m_total, detail


m_fuse_test, detail = fuselage_mass(geom, mats, m_pay)
print(f"Fuselage mass (test): {m_fuse_test:,.0f} kg  (skin t = {detail['t_skin_mm']:.2f} mm)")

# ----------------------------------------------------------------------
# Wing & tail structural weight  (Eq. A.174-A.261, root-bending-moment sparcap sizing)
# ----------------------------------------------------------------------
f_web, f_rib, f_secondary = 0.25, 0.15, 0.28   # Eq. A.248-A.250-style added-weight fractions


def wing_mass(geom: Geometry, mats: Materials, MTOM: float, S: float):
    b = np.sqrt(geom.AR * S)
    lam = geom.taper
    c_root = 2 * S / (b * (1 + lam))
    M_root = mats.N_ult * MTOM * g * b / (3 * np.pi)     # elliptic-load root bending moment, per half-wing
    h_box = geom.tc * c_root
    A_cap = M_root / (mats.sigma_cap * h_box)
    k_avg = 0.45     # span-average factor standing in for the full spanwise integral, Eq. A.174-A.207
    m_sparcap = 2 * mats.rho_al * A_cap * (b / 2) * k_avg
    m_wingbox = m_sparcap * (1 + f_web + f_rib)
    m_wing = m_wingbox * (1 + f_secondary)
    return m_wing, b, c_root


def tail_mass(geom: Geometry, S: float):
    S_h = geom.Sh_frac * S
    S_v = geom.Sv_frac * S
    k_tail = 22.0    # kg/m^2, representative areal weight for a lightly loaded tail surface
    return k_tail * S_h, k_tail * S_v


# ----------------------------------------------------------------------
# Engine weight  (Eq. A.269-A.277, simplified thrust correlation)
# ----------------------------------------------------------------------
def engine_mass(F_TO_per_eng_N: float, n_eng: int):
    k_eng = 0.22               # mass-equivalent fraction of sea-level static thrust
    f_nacelle_pylon = 0.35
    m_bare_per = k_eng * (F_TO_per_eng_N / g)
    return n_eng * m_bare_per * (1 + f_nacelle_pylon)


# ----------------------------------------------------------------------
# Aerodynamics: parasite + wave + induced drag  (simplified stand-in for Eq. A.322-A.390)
# ----------------------------------------------------------------------
def oswald_efficiency(AR, sweep_deg):
    # Raymer's fitted sweep formula is calibrated on fighter-like high-sweep
    # planforms and undershoots badly out at transport AR/sweep combinations;
    # 0.80-0.85 is the well-documented representative band for a cruise-
    # optimized, twisted-and-cambered transport wing, so a representative
    # constant is used here instead of extrapolating that fit.
    return 0.82


def form_factor_fuse(l_fuse, R_fuse):
    fr = l_fuse / (2 * R_fuse)
    return 1 + 60.0 / fr ** 3 + fr / 400.0


def form_factor_lifting(tc, sweep_deg, M):
    sweep = np.radians(sweep_deg)
    return (1 + 0.6 / 0.4 * tc + 100 * tc ** 4) * (1.34 * M ** 0.18 * np.cos(sweep) ** 0.28)


def cf_turbulent(Re, M):
    return 0.455 / (np.log10(Re)) ** 2.58 / (1 + 0.144 * M ** 2) ** 0.65


def drag_polar(geom: Geometry, S, b, c_root, M, h_m, CL, n_eng=2):
    T, p, rho, a = isa(h_m)
    V = M * a
    mu = sutherland_mu(T)

    l_fuse, R_fuse = geom.l_fuse, geom.R_fuse
    Re_fuse = rho * V * l_fuse / mu
    Re_wing = rho * V * (S / b) / mu   # mean geometric chord as reference length

    S_wet_fuse = np.pi * 2 * R_fuse * l_fuse * 0.90
    S_wet_wing = 2.02 * S
    S_h, S_v = geom.Sh_frac * S, geom.Sv_frac * S
    S_wet_tail = 2.02 * (S_h + S_v)
    S_wet_nacelle = n_eng * 16.0

    FF_fuse = form_factor_fuse(l_fuse, R_fuse)
    FF_wing = form_factor_lifting(geom.tc, geom.sweep_deg, M)
    FF_tail = form_factor_lifting(0.10, geom.sweep_deg + 5, M)
    FF_nacelle = 1.25

    cf_fuse = cf_turbulent(Re_fuse, M)
    cf_wing = cf_turbulent(Re_wing, M)

    CD0 = (cf_fuse * FF_fuse * S_wet_fuse
           + cf_wing * FF_wing * S_wet_wing
           + cf_wing * FF_tail * S_wet_tail
           + cf_wing * FF_nacelle * S_wet_nacelle) / S

    AR = geom.AR
    e = oswald_efficiency(AR, geom.sweep_deg)
    CDi = CL ** 2 / (np.pi * AR * e)

    sweep = np.radians(geom.sweep_deg)
    kA = 0.95
    M_dd = kA / np.cos(sweep) - geom.tc / np.cos(sweep) - CL / (10 * np.cos(sweep) ** 3)
    CD_wave = 20 * max(M - M_dd, 0.0) ** 4

    CD = CD0 + CDi + CD_wave
    return CD, dict(CD0=CD0, CDi=CD_wave and CDi, CD_wave=CD_wave, e=e, M_dd=M_dd, V=V, rho=rho)


# quick check
S_test = 124.0
b_test, c_root_test = np.sqrt(geom.AR * S_test), 2 * S_test / (np.sqrt(geom.AR * S_test) * (1 + geom.taper))
CD_test, dd = drag_polar(geom, S_test, b_test, c_root_test, mission.cruise_mach, mission.cruise_alt_m, mission.CL_cruise)
print(f"Test cruise point: CL={mission.CL_cruise}, CD={CD_test:.5f}, L/D={mission.CL_cruise/CD_test:.2f}, "
      f"e={dd['e']:.3f}, Mdd={dd['M_dd']:.3f}")

# ----------------------------------------------------------------------
# Propulsion: simplified ideal-cycle turbofan (Appendix B, constant cp per path)
# ----------------------------------------------------------------------
def nozzle_exit_velocity(Tt, pt, p0, gamma, R, cp, eta_n=0.98):
    pr_crit = ((gamma + 1) / 2) ** (gamma / (gamma - 1))
    if pt / p0 >= pr_crit:
        T_exit = Tt * 2 / (gamma + 1)
        V = np.sqrt(gamma * R * T_exit)
    else:
        T_ideal = Tt * (p0 / pt) ** ((gamma - 1) / gamma)
        T_exit = Tt - eta_n * (Tt - T_ideal)
        V = np.sqrt(max(2 * cp * (Tt - T_exit), 0.0))
    return V


def turbofan_cycle(eng: EngineSpec, M0, h_m):
    T0, p0, rho0, a0 = isa(h_m)
    V0 = M0 * a0
    Tt0 = T0 * (1 + (gamma_c - 1) / 2 * M0 ** 2)
    pt0 = p0 * (Tt0 / T0) ** (gamma_c / (gamma_c - 1))

    Tt2, pt2 = Tt0, pt0 * eng.pi_d
    pi_c = eng.OPR / eng.pi_f

    Tt13 = Tt2 * (1 + (eng.pi_f ** ((gamma_c - 1) / gamma_c) - 1) / eng.eta_f)
    pt13 = pt2 * eng.pi_f
    Tt3 = Tt13 * (1 + (pi_c ** ((gamma_c - 1) / gamma_c) - 1) / eng.eta_c)
    pt3 = pt13 * pi_c
    pt4 = pt3 * eng.pi_b

    f = cp_h * (eng.T4 - Tt3) / (eng.eta_b * h_fuel - cp_h * eng.T4)

    work_compressor = cp_c * (Tt3 - Tt13)
    work_fan = cp_c * (Tt13 - Tt2)
    Tt5 = eng.T4 - (work_compressor + eng.BPR * work_fan) / (cp_h * (1 + f))

    pr_t_temp_ratio = 1 - (1 - Tt5 / eng.T4) / eng.eta_t
    pt5 = pt4 * pr_t_temp_ratio ** (gamma_h / (gamma_h - 1))

    V9c = nozzle_exit_velocity(Tt5, pt5, p0, gamma_h, R_h, cp_h, eng.eta_n)
    V9f = nozzle_exit_velocity(Tt13, pt13, p0, gamma_c, R_air, cp_c, eng.eta_n)

    F_specific = (1 + f) * V9c - V0 + eng.BPR * (V9f - V0)     # N per kg/s of core flow
    # TSFC as conventionally quoted (e.g. "0.6/hr") is *weight*-specific fuel
    # consumption: c_t = (fuel weight flow)/(thrust) = f*g/F_specific, units 1/time.
    # Missing the g here understates TSFC ~10x and was the bug that made the
    # sizing loop converge to an aircraft far too small.
    TSFC_per_hr = (f * g / F_specific) * 3600.0 if F_specific > 0 else np.nan

    return dict(f=f, Tt3=Tt3, Tt4=eng.T4, Tt5=Tt5, pt3=pt3, pt4=pt4, pt5=pt5,
                V0=V0, V9c=V9c, V9f=V9f, F_specific=F_specific, TSFC_per_hr=TSFC_per_hr)


cyc = turbofan_cycle(eng, mission.cruise_mach, mission.cruise_alt_m)
print(f"Cycle check @ M{mission.cruise_mach}, {mission.cruise_alt_m/1000:.0f} km:  "
      f"f={cyc['f']:.4f}  Tt3={cyc['Tt3']:.0f} K  Tt5={cyc['Tt5']:.0f} K  "
      f"TSFC={cyc['TSFC_per_hr']:.3f} /hr  F_specific={cyc['F_specific']:.1f} N/(kg/s)")

# ----------------------------------------------------------------------
# Mission: Breguet cruise + fixed segment weight-fraction allowances
# ----------------------------------------------------------------------
SEGMENT_FRACTIONS = dict(taxi_out=0.990, takeoff=0.995, climb=0.980,
                          descent=0.990, land_taxi=0.992)


def mission_fuel_fraction(TSFC_per_hr, L_over_D, V, range_m, reserve_frac):
    mff_before = (SEGMENT_FRACTIONS['taxi_out'] * SEGMENT_FRACTIONS['takeoff']
                  * SEGMENT_FRACTIONS['climb'])
    mff_after = SEGMENT_FRACTIONS['descent'] * SEGMENT_FRACTIONS['land_taxi']

    TSFC_per_s = TSFC_per_hr / 3600.0
    mff_cruise = np.exp(-range_m * TSFC_per_s / (V * L_over_D))

    mff_total = mff_before * mff_cruise * mff_after
    fuel_frac = (1 - mff_total) * (1 + reserve_frac)
    return fuel_frac, mff_cruise


# ----------------------------------------------------------------------
# The sizing loop  (closes Sections B-G into the Section H fixed point)
# ----------------------------------------------------------------------
f_systems, f_gear = 0.070, 0.032


def size_aircraft(geom, mission, eng, mats, m_pay, MTOM_guess=65000.0,
                   n_iter=60, relax=0.5, verbose=False):
    MTOM = MTOM_guess
    history = []
    T_cr, p_cr, rho_cr, a_cr = isa(mission.cruise_alt_m)
    V_cr = mission.cruise_mach * a_cr
    cyc = turbofan_cycle(eng, mission.cruise_mach, mission.cruise_alt_m)
    TSFC = cyc['TSFC_per_hr']

    for it in range(n_iter):
        m_cruise = MTOM * SEGMENT_FRACTIONS['taxi_out'] * SEGMENT_FRACTIONS['takeoff'] * SEGMENT_FRACTIONS['climb']
        S = (m_cruise * g) / (0.5 * rho_cr * V_cr ** 2 * mission.CL_cruise)
        m_wing, b, c_root = wing_mass(geom, mats, MTOM, S)
        m_htail, m_vtail = tail_mass(geom, S)

        CD, dd = drag_polar(geom, S, b, c_root, mission.cruise_mach, mission.cruise_alt_m,
                             mission.CL_cruise, eng.n_eng)
        L_over_D = mission.CL_cruise / CD

        F_cruise_total = m_cruise * g / L_over_D
        F_TO_per_eng = F_cruise_total / (eng.n_eng * eng.cruise_thrust_lapse)

        fuel_frac, mff_cruise = mission_fuel_fraction(
            TSFC, L_over_D, V_cr, mission.range_target_km * 1000.0, mission.reserve_frac)
        m_fuel = fuel_frac * MTOM

        m_fuse, fuse_detail = fuselage_mass(geom, mats, m_pay)
        m_engine = engine_mass(F_TO_per_eng, eng.n_eng)
        m_systems = f_systems * MTOM
        m_gear = f_gear * MTOM

        OEW = m_fuse + m_wing + m_htail + m_vtail + m_engine + m_systems + m_gear
        MTOM_new = OEW + m_pay + m_fuel

        history.append(dict(it=it, MTOM=MTOM, S=S, b=b, L_D=L_over_D, TSFC=TSFC,
                             m_fuel=m_fuel, OEW=OEW, MTOM_new=MTOM_new,
                             F_TO_per_eng=F_TO_per_eng))
        if verbose:
            print(f"  it {it:2d}: MTOM={MTOM:9,.0f} -> {MTOM_new:9,.0f} kg   "
                  f"S={S:6.1f} m^2  L/D={L_over_D:5.2f}  fuel={m_fuel:7,.0f} kg")

        if abs(MTOM_new - MTOM) / MTOM < 1e-5:
            MTOM = MTOM_new
            break
        MTOM = relax * MTOM_new + (1 - relax) * MTOM

    result = dict(MTOM=MTOM, OEW=OEW, m_fuel=m_fuel, m_pay=m_pay, S=S, b=b,
                  c_root=c_root, L_D=L_over_D, TSFC=TSFC, m_wing=m_wing,
                  m_htail=m_htail, m_vtail=m_vtail, m_fuse=m_fuse,
                  m_engine=m_engine, m_systems=m_systems, m_gear=m_gear,
                  F_TO_per_eng=F_TO_per_eng, history=history,
                  fuse_detail=fuse_detail)
    return result


res = size_aircraft(geom, mission, eng, mats, m_pay, verbose=True)
print()
print(f"Converged MTOM  : {res['MTOM']:,.0f} kg")
print(f"OEW             : {res['OEW']:,.0f} kg")
print(f"Fuel (mission)  : {res['m_fuel']:,.0f} kg")
print(f"Wing area S     : {res['S']:.1f} m^2   span b = {res['b']:.1f} m")
print(f"Cruise L/D      : {res['L_D']:.2f}")
print(f"TSFC            : {res['TSFC']:.3f} /hr")
print(f"Thrust / engine (SLS-equivalent): {res['F_TO_per_eng']/1000:.1f} kN")
