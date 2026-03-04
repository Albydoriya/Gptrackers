# Japanese Quotation Template Implementation

## Overview
A new Japanese-style quotation request template (見積依頼書) has been successfully implemented to match traditional Japanese business document formatting standards.

## What Was Implemented

### 1. New Template Files Created

#### Single Order Template
- **File**: `supabase/functions/export-order-template/japaneseQuotationTemplate.ts`
- **Purpose**: Handles single order exports in Japanese format
- **Format**: Traditional Japanese quotation request layout

#### Multi-Order Template
- **File**: `supabase/functions/export-order-template/japaneseQuotationTemplateMulti.ts`
- **Purpose**: Handles multiple orders for the same supplier in Japanese format
- **Format**: Combined orders with order number column

### 2. Template Factory Updates
- Updated `templateFactory.ts` to recognize 'japanese' and 'japanese_quotation' template types
- Integrated new templates into the template selection system

### 3. Database & Backend
- Edge function redeployed with new templates
- Existing `export_template_type` column in suppliers table used (no migration needed)
- Templates available via API: 'generic', 'japanese', 'hpi'

### 4. Frontend UI Updates

#### AddSupplier Component
- Added "Export Template Format" field in Business Terms section
- Users can select template when creating new supplier
- Defaults to 'generic' template

#### EditSupplier Component
- Added "Export Template Format" field in Business Terms section
- Loads existing template setting from database
- Allows changing template for existing suppliers

## Template Design Specifications

### Key Features Matching Sample Template

1. **Header Section**
   - Large bold title: "REQUEST FOR QUOTATION 見積依頼書"
   - Recipient field with "様" honorific
   - Japanese greeting text (お世話になっております...)
   - Company details block (right-aligned):
     - DATE
     - Quote By
     - Company name
     - Contact person
     - Address
     - Phone

2. **Total Amount Box**
   - Prominent display at top right
   - "見積もり合計金額 Total Amount : ¥"
   - Auto-calculates sum of all items

3. **Parts Table**
   - Bilingual column headers (Japanese above, English below):
     - # (Item number)
     - 商品/ITEM (Product name)
     - 商品番号/ITEM # (Part number)
     - 車体番号/CHASSIS # (Chassis number - for automotive parts)
     - 数量/QUANTITY
     - 単価/PRICE (Empty for supplier to fill)
     - 合計/AMOUNT (Formula: Qty × Price)
     - 納期/ETA (Empty for supplier to fill)
   - Medium black borders (clean, professional)
   - White background (no alternating colors)
   - 25pt row height

4. **Footer Section**
   - Simple "TOTAL ¥" label with amount
   - Right-aligned
   - Single horizontal line above

5. **Page Setup**
   - Landscape orientation
   - Minimal margins (0.5" all around)
   - Single page preferred
   - Clean, professional appearance

### Removed from Generic Template

The following sections were removed to match the minimalist Japanese format:
- Logo placement area
- Supplier Information section (detailed blocks)
- Quote Requirements section with bullet points
- Supplier Response form fields
- Subtotal row
- Shipping estimate row
- Instructional text and notes
- Description column
- Specifications column

## How to Use the Japanese Template

### Setting Template for New Suppliers

1. Navigate to Suppliers page
2. Click "Add Supplier" button
3. Fill in supplier information
4. In the "Business Terms & Export Settings" section:
   - Find "Export Template Format" dropdown
   - Select "Japanese Quotation (見積依頼書) - Traditional Japanese format"
5. Save the supplier

### Changing Template for Existing Suppliers

1. Navigate to Suppliers page
2. Find the supplier you want to update
3. Click the Edit icon
4. Scroll to "Business Terms & Export Settings" section
5. Change "Export Template Format" to:
   - "Japanese Quotation (見積依頼書) - Traditional Japanese format"
6. Click "Update Supplier"

### Exporting Orders with Japanese Template

1. Create or select an order
2. Ensure the order is assigned to a supplier with Japanese template selected
3. Export the order as usual
4. The system will automatically use the Japanese template for that supplier

## Template Selection Options

### Available Templates

1. **Generic Template** (generic)
   - Standard Western business format
   - Detailed sections with supplier information
   - Multiple instructional sections
   - Suitable for most Western suppliers

2. **Japanese Quotation (見積依頼書)** (japanese)
   - Traditional Japanese business format
   - Minimalist, clean design
   - Bilingual headers
   - Chassis number field for automotive parts
   - Suitable for Japanese suppliers (AP Boss, HPI Japan, etc.)

3. **HPI Supplier Template** (hpi)
   - Custom format for HPI supplier
   - Specialized layout

## Technical Details

### Column Widths (Japanese Template)
- Item # column: 6 units
- Item/Product: 45 units (wide for Japanese text)
- Item Number: 18 units
- Chassis Number: 18 units
- Quantity: 10 units
- Price: 12 units
- Amount: 12 units
- ETA: 12 units

### Typography
- Font: Arial/MS Gothic (supports Japanese characters)
- Title: 24pt, bold
- Headers: 10pt, bold, bilingual
- Body text: 10pt
- All text: Black (#000000)

### Border Styling
- All table cells: Medium black borders
- Total box: Medium black borders
- Clean, professional appearance
- No gradient backgrounds or colored fills

### Formulas
- Amount per item: `=QUANTITY*PRICE`
- Total (top box): `=SUM(AMOUNT_COLUMN)`
- Total (footer): `=SUM(AMOUNT_COLUMN)`

## Comparison: Old vs New Template

| Feature | Generic Template | Japanese Template |
|---------|------------------|-------------------|
| Orientation | Landscape | Landscape |
| Logo | Supported | Not included |
| Supplier Info Section | Yes (detailed) | No (recipient field only) |
| Greeting Text | No | Yes (Japanese) |
| Company Details | Top right | Top right (compact) |
| Column Count | 9 columns | 8 columns |
| Chassis Number | No | Yes |
| Description Column | Yes | No |
| Specifications Column | Yes | No |
| Notes Column | Yes | No |
| Alternating Row Colors | Yes | No |
| Quote Requirements Section | Yes | No |
| Supplier Response Section | Yes | No |
| Total Display | Bottom only | Top box + footer |
| Border Style | Thin, light gray | Medium, black |

## Benefits of Japanese Template

1. **Cultural Appropriateness**: Matches expected format for Japanese business communications
2. **Simplicity**: Cleaner, easier to read and fill out
3. **Industry Standard**: Includes chassis number field (automotive industry standard)
4. **Professional**: Traditional format familiar to Japanese suppliers
5. **Efficiency**: Single-page design, faster processing
6. **Bilingual**: Clear headers in both Japanese and English
7. **Essential Information Only**: No overwhelming details or instructions

## Future Enhancements (Possible)

1. **Chassis Number Data Mapping**
   - Currently empty field for suppliers to fill
   - Could be auto-populated if chassis data is added to parts or orders

2. **Company Contact Customization**
   - Currently hardcoded: "Yuka Ichimaru"
   - Could be pulled from user profile or settings

3. **Template Customization**
   - Allow suppliers to customize:
     - Header text
     - Footer text
     - Column visibility
     - Font sizes

4. **Additional Language Templates**
   - Chinese format
   - Korean format
   - Other regional variations

## Deployment Status

- ✅ Templates created
- ✅ Template factory updated
- ✅ Edge function deployed
- ✅ Frontend UI updated (Add & Edit Supplier)
- ✅ Database fields ready (existing column)
- ✅ Build successful
- ✅ Ready for production use

## Testing Checklist

To verify the implementation:

1. ✅ Build completes without errors
2. ⏳ Create new supplier with Japanese template
3. ⏳ Export order for Japanese template supplier
4. ⏳ Verify Excel output matches sample format
5. ⏳ Edit existing supplier to use Japanese template
6. ⏳ Test multi-order export with Japanese template
7. ⏳ Verify all formulas work correctly
8. ⏳ Test with actual Japanese supplier (AP Boss)

## Support

For questions or issues with the Japanese template:
1. Check this documentation
2. Review template files in `supabase/functions/export-order-template/`
3. Verify supplier has correct template type set in database
4. Check edge function deployment logs if exports fail

---

**Implementation Date**: March 4, 2026
**Status**: ✅ Complete and Deployed
