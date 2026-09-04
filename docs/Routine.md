Agar per-slot budget **₹4,000 se max ₹5,500** hai, toh **Solution 2 (Heavy Outliers ko Liquid Bluechips se swap karna)** bilkul right approach hai.

Isse portfolio allocation balanced rahega aur koi bhi single stock pure capital ko block nahi karega.

Aapke list mein se jo stocks ₹5,500 ki upper boundary ko cross karte hain, unka exact 1-to-1 sector-matched alternate mapping yeh raha:

| High-Priced Stock (Remove) | CMP (Approx) | Sector | 1-to-1 Bluechip Replacement (Add) | Yahoo Ticker | Alternate CMP |
| --- | --- | --- | --- | --- | --- |
| **MRF** | ₹1,29,990 | Auto Ancillary / Tyres | **APOLLOTYRE** | `APOLLOTYRE.NS` | ~₹450 - ₹520 |
| **BOSCHLTD** | ₹46,800 | Auto Ancillary | **MOTHERSON** (SAMIL) | `MOTHERSON.NS` | ~₹160 - ₹200 |
| **SHREECEM** | ₹23,980 | Cement | **AMBUJACEM** | `AMBUJACEM.NS` | ~₹550 - ₹650 |
| **MARUTI** | ₹12,690 | Auto (4-Wheelers) | **TATAMOTORS** | `TATAMOTORS.NS` | ~₹950 - ₹1,100 |
| **BAJAJ-AUTO** | ₹11,911 | Auto (2-Wheelers) | **TVSMOTOR** | `TVSMOTOR.NS` | ~₹2,400 - ₹2,800 |
| **ULTRACEMCO** | ₹11,397 | Cement | **GRASIM** | `GRASIM.NS` | ~₹2,500 - ₹2,800 |
| **BAJAJHLDNG** | ₹11,157 | Finance / Holding | **CHOLAFIN** | `CHOLAFIN.NS` | ~₹1,400 - ₹1,600 |
| **DIVISLAB** | ₹9,142 | Pharma / API | **CIPLA** | `CIPLA.NS` | ~₹1,500 - ₹1,650 |
| **APOLLOHOSP** | ₹8,662 | Healthcare / Hospitals | **MAXHEALTH** | `MAXHEALTH.NS` | ~₹900 - ₹1,050 |
| **POLYCAB** | ₹8,290 | Cables & Electricals | **HAVELLS** | `HAVELLS.NS` | ~₹1,700 - ₹1,900 |
| **EICHERMOT** | ₹7,629 | Auto | **ASHOKLEY** | `ASHOKLEY.NS` | ~₹210 - ₹250 |
| **ABB** | ₹7,436 | Capital Goods / Engineering | **SIEMENS** / **BEL** | `BEL.NS` | ~₹280 - ₹320 |
| **PERSISTENT** | ₹5,652 | Mid-cap IT | **COFORGE** / **MPHASIS** | `MPHASIS.NS` | ~₹2,800 - ₹3,100 |

*(Note: **HEROMOTOCO** (~₹5,300), **BRITANNIA** (~₹5,120), **CUMMINSIND** (~₹5,040), **INTERGLOBE** (~₹5,000), aur **TITAN** (~₹5,000) ₹5,500 ke strict limit ke andar fit ho jate hain, isliye inhein retain kiya ja sakta hai).*

---

### Implementation Steps

#### 1. `src/Config.js` Update

`MASTER_UNIVERSE_100` array mein upar diye gaye 13 symbols ko unke respective replacement ticker aur symbol se swap kar lijiye.

#### 2. `WATCHLIST` Sheet Tab Update

Google Sheet ke `WATCHLIST` tab mein jaakar unhi rows par:

* Symbol
* Company Name
* Yahoo Ticker (`.NS`)
replace kar lijiye.

#### 3. Safety Guard in `Config.js` (Optional Backup)

Kisi bhi unexpected price surge se bachne ke liye `CONFIG` object mein ek cap add kar lijiye:

```javascript
MAX_SHARE_PRICE: 5500,

```

Aur `SignalEngine.js` mein candidate push hone se pehle ek guard laga dijiye:

```javascript
if (cmp > CONFIG.MAX_SHARE_PRICE) {
  finalSignal = "SKIPPED_PRICE";
  reason = `CMP ₹${cmp} exceeds max unit slot limit ₹${CONFIG.MAX_SHARE_PRICE}`;
}

```

Isse aapka universe 100 stocks ka complete rahega aur koi bhi trade aapke capital rules ko break nahi karega.
