# Menampilkan notifikasi Windows (toast) berisi judul dan pesan. Dipakai pemicu lokal.
# Contoh: powershell -File scripts\notifikasi-windows.ps1 -Judul "LAJU" -Isi "Halo"
param(
  [Parameter(Mandatory = $true)][string]$Judul,
  [Parameter(Mandatory = $true)][string]$Isi
)

try {
  [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
  $xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
  $teks = $xml.GetElementsByTagName('text')
  $teks.Item(0).AppendChild($xml.CreateTextNode($Judul)) | Out-Null
  $teks.Item(1).AppendChild($xml.CreateTextNode($Isi)) | Out-Null
  $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
  # Memakai identitas aplikasi PowerShell supaya notifikasi diterima tanpa pendaftaran khusus.
  $pengirim = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'
  [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($pengirim).Show($toast)
} catch {
  exit 1
}
