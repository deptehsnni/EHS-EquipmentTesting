# Register Equipment UI/UX Revision Plan

## **Status:** 🔄 Planning

## **Information Gathered:**
- Current file: `src/pages/RegisterEquipmentPage.tsx` (520+ lines)
- Uses inline styles (inconsistent)
- Has 3 sections: Info Umum, Riksa Uji, Spesifikasi  
- Import Excel + Success modal functional
- Uses `.input-field` class (sudah ada border dari fix sebelumnya)
- Layout: grid responsive OK tapi plain

## **Plan:**
### 1. **Hero Section** (NEW)
```
Header stats cards: Total Registered | Today | Kategori Populer
Progress indicator: 3/5 steps completed
```

### 2. **Section Redesign**
```
Info Umum → Icon headers + better spacing
Riksa Uji → Auto-calc next date visual
Spesifikasi → Dynamic fields based on category
```

### 3. **Enhanced Import**
```
Drag & drop area
Preview table dengan edit inline
Bulk validate + error highlighting
```

### 4. **Live QR Preview**
```
Generate QR real-time di sidebar kanan
Download button + copy link
```

### 5. **Success Modal Upgrade**
```
Confetti animation
3-CTA layout: Lihat Detail | Daftar Lagi | Share
```

## **Dependent Files:**
```
🔄 UPDATE: src/pages/RegisterEquipmentPage.tsx (main)
🔄 UPDATE: src/index.css (new classes)
📱 NEW: src/components/EquipmentFormHero.tsx (optional)
```

## **Follow-up Steps:**
1. Implement hero + stats
2. Refactor sections dengan cards
3. Add live QR preview
4. Test all functions (single + bulk import)
5. Push ke GitHub

**Approve plan ini untuk lanjut?**

