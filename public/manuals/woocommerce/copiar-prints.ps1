# Atualiza as imagens do manual WooCommerce em public/manuals/woocommerce/.
#
# Opção A — fonte padrão no repositório (woocommerce1 = WordPress/WooCommerce, woocommerce2 = Azoup):
#   .\public\manuals\woocommerce\copiar-prints.ps1 -FromDocs
#
# Opção B — caminhos arbitrários:
#   .\public\manuals\woocommerce\copiar-prints.ps1 -Woo "C:\...\woo.png" -Azoup "C:\...\azoup.png"
param(
  [switch] $FromDocs,
  [string] $Woo,
  [string] $Azoup
)
$dir = $PSScriptRoot
if ($FromDocs) {
  $root = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path
  $prints = Join-Path $root "docs\manuais\prints"
  if (-not (Test-Path (Join-Path $prints "woocommerce1.png"))) {
    throw "Não encontrado: $prints\woocommerce1.png"
  }
  if (-not (Test-Path (Join-Path $prints "woocommerce2.png"))) {
    throw "Não encontrado: $prints\woocommerce2.png"
  }
  Copy-Item (Join-Path $prints "woocommerce1.png") (Join-Path $dir "woo-rest-api-chaves.png") -Force
  Copy-Item (Join-Path $prints "woocommerce2.png") (Join-Path $dir "azoup-integracao-parametros.png") -Force
  Write-Host "OK: copiado de $prints -> $dir"
  exit 0
}
if (-not $Woo -or -not $Azoup) {
  Write-Host "Use -FromDocs ou informe -Woo e -Azoup."
  exit 1
}
Copy-Item -LiteralPath $Woo -Destination (Join-Path $dir "woo-rest-api-chaves.png") -Force
Copy-Item -LiteralPath $Azoup -Destination (Join-Path $dir "azoup-integracao-parametros.png") -Force
Write-Host "OK: imagens atualizadas em $dir"
