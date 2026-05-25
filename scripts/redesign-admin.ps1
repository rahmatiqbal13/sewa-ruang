# Script to redesign admin UI files according to 2026 UI trends
# Only modifies Tailwind CSS utility classes, preserves all logic

$root = Split-Path -Parent $PSScriptRoot

$files = @(
    "src/app/(admin)/admin/reports/page.tsx",
    "src/app/(admin)/admin/returns/page.tsx",
    "src/app/(admin)/admin/returns/[id]/page.tsx",
    "src/app/(admin)/admin/returns/[id]/RecordReturnForm.tsx",
    "src/app/(admin)/admin/returns/[id]/CompleteReturnForm.tsx",
    "src/app/(admin)/admin/payments/page.tsx",
    "src/app/(admin)/admin/payments/verify/page.tsx",
    "src/app/(admin)/admin/payments/RecordPaymentButton.tsx",
    "src/app/(admin)/admin/payments/PaymentMethodsPanel.tsx",
    "src/app/(admin)/admin/payments/DeleteTransactionButton.tsx",
    "src/app/(admin)/admin/payments/DeletePaymentButton.tsx",
    "src/app/(admin)/admin/returns/DeleteReturnButton.tsx",
    "src/app/(admin)/admin/rooms/page.tsx",
    "src/app/(admin)/admin/rooms/RoomsPageClient.tsx",
    "src/app/(admin)/admin/rooms/[id]/page.tsx",
    "src/app/(admin)/admin/rooms/new/page.tsx",
    "src/app/(admin)/admin/rooms/[id]/edit/page.tsx",
    "src/app/(admin)/admin/rooms/RoomForm.tsx",
    "src/app/(admin)/admin/rooms/RoomFilters.tsx",
    "src/app/(admin)/admin/rooms/RoomActions.tsx",
    "src/app/(admin)/admin/rooms/DeleteRoomButton.tsx",
    "src/app/(admin)/admin/qr/page.tsx",
    "src/app/(admin)/admin/qr/QRCodeDisplay.tsx",
    "src/app/(admin)/admin/qr/batch/page.tsx",
    "src/app/(admin)/admin/qr/batch/BatchQRClient.tsx",
    "src/app/(admin)/admin/notifications/page.tsx",
    "src/app/(admin)/admin/notifications/ChannelConfig.tsx",
    "src/app/(admin)/admin/notifications/TemplateEditor.tsx",
    "src/app/(admin)/admin/bookings/page.tsx",
    "src/app/(admin)/admin/bookings/new/page.tsx",
    "src/app/(admin)/admin/bookings/[id]/page.tsx",
    "src/app/(admin)/admin/bookings/BookingsList.tsx",
    "src/app/(admin)/admin/bookings/BookingQuickActions.tsx",
    "src/app/(admin)/admin/bookings/AdminBookingForm.tsx",
    "src/app/(admin)/admin/bookings/SendMessageDialog.tsx",
    "src/app/(admin)/admin/bookings/[id]/ApprovalButtons.tsx",
    "src/app/(admin)/admin/bookings/[id]/SendMessageButton.tsx",
    "src/app/(admin)/admin/bookings/[id]/EarlyReturnButton.tsx",
    "src/app/(admin)/admin/database/page.tsx",
    "src/app/(admin)/admin/payment-methods/page.tsx",
    "src/app/(admin)/admin/page.tsx",
    "src/app/(admin)/admin/buildings/new/page.tsx",
    "src/app/(admin)/admin/buildings/[id]/edit/page.tsx",
    "src/app/(admin)/admin/buildings/DeleteBuildingButton.tsx",
    "src/app/(admin)/admin/equipment/new/page.tsx",
    "src/app/(admin)/admin/equipment/[slug]/page.tsx",
    "src/app/(admin)/admin/equipment/[slug]/edit/page.tsx",
    "src/app/(admin)/admin/equipment/EquipmentFilters.tsx",
    "src/app/(admin)/admin/equipment/EquipmentRatesForm.tsx",
    "src/app/(admin)/admin/equipment/RoomSelect.tsx",
    "src/app/(admin)/admin/equipment/LocationSelect.tsx",
    "src/app/(admin)/admin/equipment/SoftDeleteButtons.tsx",
    "src/app/(admin)/admin/equipment/BulkActions.tsx",
    "src/app/(admin)/admin/equipment/DeleteEquipmentButton.tsx",
    "src/app/(admin)/admin/assets/page.tsx",
    "src/app/(admin)/admin/assets/AssetActions.tsx",
    "src/app/(admin)/admin/assets/AssetForm.tsx",
    "src/app/(admin)/admin/assets/new/page.tsx",
    "src/app/(admin)/admin/assets/[id]/edit/page.tsx"
)

$replacements = @(
    @{ pattern = '\bbg-white\b'; replacement = 'bg-card' },
    @{ pattern = '\bbg-slate-50\b'; replacement = 'bg-muted' },
    @{ pattern = '\bbg-gray-50\b'; replacement = 'bg-muted' },
    @{ pattern = '\bbg-zinc-50\b'; replacement = 'bg-muted' },
    @{ pattern = '\btext-slate-900\b'; replacement = 'text-foreground' },
    @{ pattern = '\btext-gray-900\b'; replacement = 'text-foreground' },
    @{ pattern = '\btext-zinc-900\b'; replacement = 'text-foreground' },
    @{ pattern = '\btext-slate-800\b'; replacement = 'text-foreground' },
    @{ pattern = '\btext-gray-800\b'; replacement = 'text-foreground' },
    @{ pattern = '\btext-zinc-800\b'; replacement = 'text-foreground' },
    @{ pattern = '\btext-slate-700\b'; replacement = 'text-foreground/80' },
    @{ pattern = '\btext-gray-700\b'; replacement = 'text-foreground/80' },
    @{ pattern = '\btext-zinc-700\b'; replacement = 'text-foreground/80' },
    @{ pattern = '\btext-slate-600\b'; replacement = 'text-muted-foreground' },
    @{ pattern = '\btext-gray-600\b'; replacement = 'text-muted-foreground' },
    @{ pattern = '\btext-zinc-600\b'; replacement = 'text-muted-foreground' },
    @{ pattern = '\btext-slate-500\b'; replacement = 'text-muted-foreground' },
    @{ pattern = '\btext-gray-500\b'; replacement = 'text-muted-foreground' },
    @{ pattern = '\btext-zinc-500\b'; replacement = 'text-muted-foreground' },
    @{ pattern = '\btext-slate-400\b'; replacement = 'text-muted-foreground/70' },
    @{ pattern = '\btext-gray-400\b'; replacement = 'text-muted-foreground/70' },
    @{ pattern = '\btext-zinc-400\b'; replacement = 'text-muted-foreground/70' },
    @{ pattern = '\bborder-slate-200\b'; replacement = 'border-border' },
    @{ pattern = '\bborder-gray-200\b'; replacement = 'border-border' },
    @{ pattern = '\bborder-zinc-200\b'; replacement = 'border-border' },
    @{ pattern = '\bborder-slate-100\b'; replacement = 'border-border/60' },
    @{ pattern = '\bborder-gray-100\b'; replacement = 'border-border/60' },
    @{ pattern = '\bborder-zinc-100\b'; replacement = 'border-border/60' },
    @{ pattern = '\bhover:bg-slate-50\b'; replacement = 'hover:bg-muted' },
    @{ pattern = '\bhover:bg-gray-50\b'; replacement = 'hover:bg-muted' },
    @{ pattern = '\bhover:bg-zinc-50\b'; replacement = 'hover:bg-muted' },
    @{ pattern = '\bhover:bg-slate-100\b'; replacement = 'hover:bg-muted' },
    @{ pattern = '\bhover:bg-gray-100\b'; replacement = 'hover:bg-muted' },
    @{ pattern = '\bhover:bg-zinc-100\b'; replacement = 'hover:bg-muted' },
    @{ pattern = '\brounded-xl\b'; replacement = 'rounded-[14px]' },
    @{ pattern = '\brounded-2xl\b'; replacement = 'rounded-[14px]' },
    @{ pattern = '\brounded-lg\b'; replacement = 'rounded-[10px]' }
)

$editedFiles = @()
$skippedFiles = @()

foreach ($relPath in $files) {
    $fullPath = Join-Path $root $relPath
    if (-not (Test-Path $fullPath)) {
        $skippedFiles += $relPath
        continue
    }
    
    $content = Get-Content -Raw -Path $fullPath
    $original = $content
    
    foreach ($repl in $replacements) {
        $content = $content -replace $repl.pattern, $repl.replacement
    }
    
    # Remove gradient backgrounds on content areas - replace with bg-primary
    $content = $content -replace 'bg-gradient-to-r\s+from-[a-z]+-\d+\s+to-[a-z]+-\d+', 'bg-primary'
    $content = $content -replace 'bg-gradient-to-br\s+from-[a-z]+-\d+\s+to-[a-z]+-\d+', 'bg-primary'
    $content = $content -replace 'bg-gradient-to-b\s+from-[a-z]+-\d+\s+to-[a-z]+-\d+', 'bg-primary'
    $content = $content -replace 'bg-gradient-to-l\s+from-[a-z]+-\d+\s+to-[a-z]+-\d+', 'bg-primary'
    $content = $content -replace 'bg-gradient-to-tr\s+from-[a-z]+-\d+\s+to-[a-z]+-\d+', 'bg-primary'
    $content = $content -replace 'bg-gradient-to-bl\s+from-[a-z]+-\d+\s+to-[a-z]+-\d+', 'bg-primary'
    
    if ($content -ne $original) {
        Set-Content -Path $fullPath -Value $content -NoNewline
        $editedFiles += $relPath
    }
}

Write-Host "=== EDIT RESULTS ==="
Write-Host ""
Write-Host "Files edited: $($editedFiles.Count)"
$editedFiles | ForEach-Object { Write-Host "  OK: $_" }
Write-Host ""
Write-Host "Files not found: $($skippedFiles.Count)"
$skippedFiles | ForEach-Object { Write-Host "  MISSING: $_" }
