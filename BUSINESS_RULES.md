/**
 * Business Rules Documentation
 * Common Charges Calculation System
 * 
 * Version: 1.0.0
 * Last Updated: 2026-01-13
 */

# BUSINESS RULES - ΚΟΙΝΟΧΡΗΣΤΑ ΠΟΛΥΚΑΤΟΙΚΙΑΣ

## 1. DOMAIN MODEL

### 1.1 Entities
- **Building**: Πολυκατοικία με ρυθμίσεις
- **Apartment**: Διαμέρισμα με χιλιοστά
- **CommonChargePeriod**: Περίοδος έκδοσης κοινοχρήστων (μήνας)
- **Expense**: Έξοδο προς κατανομή
- **ExpenseCategory**: Κατηγορία εξόδου (καθορίζει τρόπο κατανομής)

### 1.2 Core Attributes
**Apartment:**
- `sharePercentage`: Γενικά χιλιοστά (0-100%)
- `heatingSharePercentage`: Χιλιοστά θέρμανσης (0-100%)
- `isOccupied`: Κατοικημένο ή κενό
- `isExcluded`: Εξαιρείται από χρεώσεις

**Expense:**
- `amount`: Ποσό προς κατανομή
- `categoryId`: Κατηγορία
- `distributionMethod`: Μέθοδος κατανομής

---

## 2. DISTRIBUTION METHODS (Μέθοδοι Κατανομής)

### 2.1 GENERAL_SHARE (Γενικά Χιλιοστά)
**Χρήση:** Καθαριότητα, ηλεκτρικό κοινόχρηστων, συντήρηση

**Κανόνας:**
```
Χρέωση διαμερίσματος = (Συνολικό Έξοδο × Χιλιοστά Διαμερίσματος) / Σύνολο Χιλιοστών
```

**Παράδειγμα:**
- Έξοδο: €200
- Διαμέρισμα Α: 30% χιλιοστά → €60
- Διαμέρισμα Β: 20% χιλιοστά → €40
- Διαμέρισμα Γ: 50% χιλιοστά → €100

**Edge Cases:**
- Εξαιρούμενα διαμερίσματα ΔΕΝ συμμετέχουν
- Το σύνολο χιλιοστών υπολογίζεται μόνο από ενεργά διαμερίσματα

---

### 2.2 HEATING_SHARE (Χιλιοστά Θέρμανσης)
**Χρήση:** Έξοδα κεντρικής θέρμανσης (πάγιο)

**Κανόνας:**
```
Χρέωση = (Συνολικό Έξοδο × Χιλιοστά Θέρμανσης) / Σύνολο Χιλιοστών Θέρμανσης
```

**Ειδικά:**
- Μόνο διαμερίσματα με `heatingSharePercentage > 0`
- Διαμερίσματα χωρίς θέρμανση → €0

---

### 2.3 CONSUMPTION_BASED (Κατανάλωση)
**Χρήση:** Πετρέλαιο θέρμανσης, νερό με μετρητές

**Κανόνας:**
```
Χρέωση διαμερίσματος = Κατανάλωση × Τιμή Μονάδας
```

**Breakdown:**
1. Υπολογισμός κόστους ανά διαμέρισμα (κατανάλωση × τιμή)
2. Προσθήκη προηγούμενου υπολοίπου
3. Υπολογισμός μη κατανεμημένου κόστους (fixed costs)
4. Κατανομή υπολοίπου με HEATING_SHARE

**Edge Cases:**
- Μηδενική κατανάλωση → Μόνο fixed costs
- Κενό διαμέρισμα με debt → Χρεώνεται το debt

---

### 2.4 EQUAL_SPLIT (Ίση Κατανομή)
**Χρήση:** Έξοδα που επηρεάζουν όλους εξίσου

**Κανόνας:**
```
Χρέωση = Συνολικό Έξοδο / Αριθμός Διαμερισμάτων
```

**Παράδειγμα:**
- Έξοδο: €100
- 4 διαμερίσματα → €25 το καθένα

---

### 2.5 CUSTOM (Προσαρμοσμένη)
**Χρήση:** Ειδικές περιπτώσεις

**Κανόνας:**
- Χειροκίνητος καθορισμός ποσοστών ανά διαμέρισμα
- Το άθροισμα ποσοστών ΠΡΕΠΕΙ να είναι 100%

**Validation:**
```typescript
if (sum(customPercentages) !== 100) {
  throw Error('Custom percentages must sum to 100%');
}
```

---

## 3. SPECIAL CATEGORIES (Ειδικές Κατηγορίες)

### 3.1 Elevator (Ανελκυστήρας)
**Κανόνας:**
- Μόνο διαμερίσματα που χρησιμοποιούν ανελκυστήρα
- Συνήθως εξαιρούνται ισόγεια

**Implementation:**
```typescript
expense.includedApartmentIds = ['apt-1a', 'apt-2a', 'apt-3a'];
expense.distributionMethod = GENERAL_SHARE; // or EQUAL_SPLIT
```

### 3.2 Garden (Κήπος)
**Κανόνας:**
- Μόνο διαμερίσματα με πρόσβαση σε κήπο
- Συνήθως ισόγεια ή ημιυπόγεια

### 3.3 Storage Rooms (Αποθήκες)
**Κανόνας:**
- Κατανομή στους ιδιοκτήτες αποθηκών
- Ανάλογα με m² ή ίση κατανομή

---

## 4. ROUNDING & BALANCE ADJUSTMENT

### 4.1 Το Πρόβλημα
```
Έξοδο: €10.00
3 διαμερίσματα με 33.33%, 33.33%, 33.34%

Χωρίς adjustment:
- Δ1: €3.33
- Δ2: €3.33
- Δ3: €3.33
Άθροισμα: €9.99 ❌ (χάνουμε €0.01)
```

### 4.2 Strategies

#### DISTRIBUTE (Προτεινόμενο)
**Λογική:**
- Κατανομή διαφοράς σε μικρά increments
- Προτεραιότητα σε διαμερίσματα με μεγαλύτερο ποσοστό

**Πλεονεκτήματα:**
- Δίκαιο (ανάλογα με μέγεθος)
- Μικρές διαφορές ανά διαμέρισμα

#### FIRST_APARTMENT
**Λογική:**
- Όλη η διαφορά στο πρώτο διαμέρισμα

**Πλεονεκτήματα:**
- Απλό
- Γρήγορο

**Μειονεκτήματα:**
- Άδικο σε μεγάλες διαφορές

#### LARGEST_SHARE
**Λογική:**
- Όλη η διαφορά στο διαμέρισμα με το μεγαλύτερο ποσοστό

**Πλεονεκτήματα:**
- Λογικό (μεγαλύτερο διαμέρισμα → μεγαλύτερη διαφορά)

### 4.3 Invariant (ΚΡΙΣΙΜΟ)
```typescript
// ALWAYS TRUE:
sum(apartmentCharges) === totalExpenses

// Tolerance for floating point:
Math.abs(sum - total) < 0.01
```

---

## 5. RESERVE FUND (Αποθεματικό)

### 5.1 Contribution (Εισφορά)
**Κανόνας:**
```
Εισφορά διαμερίσματος = Συνολικό Ποσό × (Ποσοστό / 100)
```

**Παράδειγμα:**
- Αποθεματικό: €100/μήνα
- Κατανομή: GENERAL_SHARE
- Διαμέρισμα 30% → €30

### 5.2 Withdrawal (Ανάληψη)
**Χρήση:**
- Έκτακτα έξοδα
- Χρήση αποθεματικού

**Κανόνας:**
- ΔΕΝ χρεώνεται στα διαμερίσματα
- Αφαιρείται από το αποθεματικό

### 5.3 Balance Tracking
```typescript
newBalance = previousBalance + contributions - withdrawals
```

---

## 6. PERIOD LOCKING & IMMUTABILITY

### 6.1 Locked Period
**Κανόνες:**
```
if (period.isLocked) {
  // ✅ Allowed:
  - Re-print PDF (same data = same result)
  - View breakdown
  
  // ❌ Forbidden:
  - Modify expenses
  - Add/remove expenses
  - Change apartment shares
  - Regenerate with different data
}
```

### 6.2 Deterministic Calculation
**Guarantee:**
```
Same Inputs → Same Outputs (always)
```

**Implementation:**
```typescript
inputHash = sha256(JSON.stringify({
  periodId,
  expenses,
  apartments,
  settings,
}));

// Store with calculation results
// On recalculation: verify inputHash matches
```

---

## 7. AUDITABILITY REQUIREMENTS

### 7.1 Per Apartment Breakdown
**MUST Store:**
```typescript
{
  apartmentId: string,
  expenses: [
    {
      expenseId: string,
      description: string,
      totalAmount: number,
      sharePercentage: number,
      calculatedAmount: number, // Before rounding
      finalAmount: number,      // After rounding
      roundingAdjustment: number,
    }
  ],
  subtotal: number,
  previousBalance: number,
  total: number,
}
```

### 7.2 Category Summary
**MUST Store:**
```typescript
{
  categoryName: string,
  totalAmount: number,
  totalDistributed: number,
  distributionVariance: number, // MUST be 0
  apartmentsCharged: number,
}
```

### 7.3 Metadata
```typescript
{
  calculatedAt: timestamp,
  periodId: string,
  inputHash: string,
  calculationVersion: string,
  settings: {...},
}
```

---

## 8. VALIDATION RULES

### 8.1 Pre-Calculation
```typescript
✓ At least 1 active apartment
✓ At least 1 expense
✓ Total share percentage > 0
✓ All expense amounts > 0
✓ Custom distributions sum to 100%
```

### 8.2 Post-Calculation
```typescript
✓ sum(apartmentCharges) === totalExpenses (±0.01)
✓ All category variances === 0 (±0.01)
✓ No negative charges (unless credit)
```

---

## 9. EDGE CASES

### 9.1 All Apartments Excluded
**Result:** Error - cannot calculate

### 9.2 Zero Consumption Heating
**Result:**
- Charge = previous balance only
- Fixed costs distributed by heating share

### 9.3 Single Apartment Building
**Result:**
- All charges → 100% to that apartment
- No rounding issues

### 9.4 Negative Previous Balance (Credit)
**Result:**
- Subtract from current charges
- Can result in negative total (credit carried forward)

---

## 10. CALCULATION FLOW

```
1. VALIDATE INPUTS
   ├─ Check apartments exist
   ├─ Check expenses valid
   └─ Check share percentages

2. FILTER ACTIVE APARTMENTS
   └─ Exclude isExcluded = true

3. FOR EACH EXPENSE:
   ├─ Determine target apartments
   ├─ Calculate distribution
   ├─ Round amounts
   └─ Apply rounding adjustments

4. CALCULATE HEATING (if applicable)
   ├─ Consumption-based charges
   ├─ Add fixed costs
   └─ Round and adjust

5. CALCULATE RESERVE FUND (if applicable)
   ├─ Contributions
   ├─ Withdrawals
   └─ Update balance

6. CALCULATE TOTALS
   ├─ Subtotal per apartment
   ├─ Add previous balance
   └─ Final total

7. GENERATE SUMMARIES
   ├─ Category summaries
   ├─ Reserve fund summary
   └─ Validation checks

8. VERIFY INVARIANTS
   ├─ Total distributed = total expenses
   └─ Category variances = 0

9. RETURN COMPLETE BREAKDOWN
   └─ Ready for persistence/printing
```

---

## 11. FUTURE EXTENSIONS

### Potential Additions:
- [ ] VAT calculations per category
- [ ] Discounts for early payment
- [ ] Payment plans (installments)
- [ ] Seasonal adjustments (summer/winter)
- [ ] Tiered pricing (usage brackets)
- [ ] Special exemptions (elderly, disabled)

### NOT in Scope:
- ❌ Tax calculations (country-specific)
- ❌ Payment processing
- ❌ Email notifications
- ❌ UI components
