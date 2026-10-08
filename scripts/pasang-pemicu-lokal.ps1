# Memasang pemicu lokal LAJU: satu salinan khusus repositori + satu tugas di Penjadwal Tugas Windows.
# Tugasnya mengecek tiap 30 menit (dan saat kamu login) apakah jam pembaruan sudah lewat tanpa
# pembaruan; bila ya, ia memicu workflow GitHub lewat commit kecil pada pemicu.txt (scripts/pemicu-lokal.mjs).
#
# Pasang  : powershell -ExecutionPolicy Bypass -File scripts\pasang-pemicu-lokal.ps1
# Copot   : powershell -ExecutionPolicy Bypass -File scripts\pasang-pemicu-lokal.ps1 -Copot
# Tanpa hak Administrator. Tugas hanya berjalan saat kamu login.
# Folder salinan sengaja BUKAN di AppData: aplikasi berpaket (mis. aplikasi desktop Claude)
# mengalihkan penulisan AppData ke folder paketnya, sehingga Penjadwal Tugas tidak melihat berkasnya.
param(
  [string]$Folder = (Join-Path $env:USERPROFILE 'laju-pemicu'),
  [string]$Repo = 'https://github.com/dianagush/laju.git',
  [switch]$Copot
)

$nama = 'LAJU pemicu pembaruan'

if ($Copot) {
  Unregister-ScheduledTask -TaskName $nama -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Tugas '$nama' dicopot. Salinan di $Folder dibiarkan; hapus sendiri bila tidak diperlukan."
  exit 0
}

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
  Write-Host 'Node.js tidak ditemukan. Pasang dari https://nodejs.org lalu ulangi.'
  exit 1
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host 'Git tidak ditemukan. Pasang dari https://git-scm.com lalu ulangi.'
  exit 1
}

# Salinan khusus, di luar OneDrive dan di luar folder kerja, supaya pemicu tidak menyentuh pekerjaanmu.
if (Test-Path (Join-Path $Folder '.git')) {
  git -C $Folder pull --ff-only --quiet
} else {
  git clone --quiet $Repo $Folder
}
if ($LASTEXITCODE -ne 0) {
  Write-Host "Gagal menyiapkan salinan di $Folder."
  exit 1
}
if (-not (Test-Path (Join-Path $Folder 'scripts\pemicu-lokal.mjs'))) {
  Write-Host 'Skrip pemicu belum ada di GitHub. Push dulu perubahan terbaru, lalu ulangi.'
  exit 1
}

# conhost --headless menjalankan Node tanpa jendela yang berkedip tiap 30 menit.
# Jalur skrip absolut: skripnya menemukan foldernya sendiri, jadi folder kerja tidak diperlukan.
$skripLengkap = Join-Path $Folder 'scripts\pemicu-lokal.mjs'
$aksi = New-ScheduledTaskAction -Execute 'conhost.exe' -Argument "--headless `"$node`" `"$skripLengkap`" --tarik"

$harian = New-ScheduledTaskTrigger -Daily -At '08:00'
$ulang = New-ScheduledTaskTrigger -Once -At '08:00' -RepetitionInterval (New-TimeSpan -Minutes 30) -RepetitionDuration (New-TimeSpan -Hours 15)
$harian.Repetition = $ulang.Repetition
$pengguna = "$env:USERDOMAIN\$env:USERNAME"
$masuk = New-ScheduledTaskTrigger -AtLogOn -User $pengguna

$pengaturan = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -RunOnlyIfNetworkAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
$prinsipal = New-ScheduledTaskPrincipal -UserId $pengguna -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $nama -Action $aksi -Trigger @($harian, $masuk) -Settings $pengaturan -Principal $prinsipal `
  -Description 'Memicu pembaruan portal LAJU di GitHub bila jam pembaruan terlewat. Dicopot dengan pasang-pemicu-lokal.ps1 -Copot.' -Force | Out-Null

Write-Host "Terpasang: '$nama' (tiap 30 menit pukul 08.00-23.00 dan saat login)."
Write-Host "Salinan   : $Folder"
Write-Host "Log       : $Folder\.laju\pemicu.log"
Write-Host "Coba      : Start-ScheduledTask -TaskName '$nama'"
