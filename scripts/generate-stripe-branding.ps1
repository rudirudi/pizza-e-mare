Add-Type -AssemblyName System.Drawing

$assetsDirectory = Join-Path $PSScriptRoot '..\public\assets'
$iconPath = Join-Path $assetsDirectory 'stripe-icon.png'
$logoPath = Join-Path $assetsDirectory 'stripe-logo.png'

$royalBlue = [System.Drawing.ColorTranslator]::FromHtml('#2A35B8')
$turquoise = [System.Drawing.ColorTranslator]::FromHtml('#0E7F8F')
$paleAqua = [System.Drawing.ColorTranslator]::FromHtml('#F2FAFC')
$orangeRed = [System.Drawing.ColorTranslator]::FromHtml('#C93A17')
$pizzaGold = [System.Drawing.ColorTranslator]::FromHtml('#F2B24A')
$white = [System.Drawing.Color]::White

function New-Canvas([int]$width, [int]$height) {
  $bitmap = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear([System.Drawing.Color]::Transparent)
  return @($bitmap, $graphics)
}

function Draw-Mark($graphics, [float]$x, [float]$y, [float]$size) {
  $blueBrush = New-Object System.Drawing.SolidBrush $royalBlue
  $aquaBrush = New-Object System.Drawing.SolidBrush $paleAqua
  $goldBrush = New-Object System.Drawing.SolidBrush $pizzaGold
  $redBrush = New-Object System.Drawing.SolidBrush $orangeRed
  $whitePen = New-Object System.Drawing.Pen $white, ($size * 0.035)
  $wavePen = New-Object System.Drawing.Pen $turquoise, ($size * 0.055)
  $wavePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $wavePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $graphics.FillEllipse($blueBrush, $x, $y, $size, $size)
  $inset = $size * 0.075
  $graphics.FillEllipse($aquaBrush, $x + $inset, $y + $inset, $size - 2 * $inset, $size - 2 * $inset)

  $slice = New-Object System.Drawing.Drawing2D.GraphicsPath
  $slice.AddPolygon([System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF ($x + $size * 0.28), ($y + $size * 0.27)),
    (New-Object System.Drawing.PointF ($x + $size * 0.72), ($y + $size * 0.33)),
    (New-Object System.Drawing.PointF ($x + $size * 0.43), ($y + $size * 0.70))
  ))
  $graphics.FillPath($goldBrush, $slice)
  $graphics.DrawPath($whitePen, $slice)
  $graphics.DrawArc($whitePen, $x + $size * 0.25, $y + $size * 0.20, $size * 0.51, $size * 0.25, 10, 160)
  $graphics.FillEllipse($redBrush, $x + $size * 0.39, $y + $size * 0.37, $size * 0.09, $size * 0.09)
  $graphics.FillEllipse($redBrush, $x + $size * 0.54, $y + $size * 0.42, $size * 0.08, $size * 0.08)

  $graphics.DrawBezier($wavePen,
    (New-Object System.Drawing.PointF ($x + $size * 0.19), ($y + $size * 0.73)),
    (New-Object System.Drawing.PointF ($x + $size * 0.34), ($y + $size * 0.62)),
    (New-Object System.Drawing.PointF ($x + $size * 0.44), ($y + $size * 0.84)),
    (New-Object System.Drawing.PointF ($x + $size * 0.58), ($y + $size * 0.72)))
  $graphics.DrawBezier($wavePen,
    (New-Object System.Drawing.PointF ($x + $size * 0.58), ($y + $size * 0.72)),
    (New-Object System.Drawing.PointF ($x + $size * 0.70), ($y + $size * 0.61)),
    (New-Object System.Drawing.PointF ($x + $size * 0.75), ($y + $size * 0.78)),
    (New-Object System.Drawing.PointF ($x + $size * 0.84), ($y + $size * 0.70)))

  $slice.Dispose()
  $blueBrush.Dispose()
  $aquaBrush.Dispose()
  $goldBrush.Dispose()
  $redBrush.Dispose()
  $whitePen.Dispose()
  $wavePen.Dispose()
}

$iconCanvas = New-Canvas 512 512
$iconBitmap = $iconCanvas[0]
$iconGraphics = $iconCanvas[1]
Draw-Mark $iconGraphics 16 16 480
$iconBitmap.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
$iconGraphics.Dispose()
$iconBitmap.Dispose()

$logoCanvas = New-Canvas 900 240
$logoBitmap = $logoCanvas[0]
$logoGraphics = $logoCanvas[1]
Draw-Mark $logoGraphics 14 14 212

$titleBrush = New-Object System.Drawing.SolidBrush $royalBlue
$subtitleBrush = New-Object System.Drawing.SolidBrush $turquoise
$titleFont = New-Object System.Drawing.Font 'Segoe UI', 58, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$subtitleFont = New-Object System.Drawing.Font 'Segoe UI', 25, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$logoGraphics.DrawString('PIZZA & MARE', $titleFont, $titleBrush, 252, 54)
$logoGraphics.DrawString('PIZZERIA  •  FRIGGITORIA', $subtitleFont, $subtitleBrush, 258, 132)
$logoBitmap.Save($logoPath, [System.Drawing.Imaging.ImageFormat]::Png)

$titleBrush.Dispose()
$subtitleBrush.Dispose()
$titleFont.Dispose()
$subtitleFont.Dispose()
$logoGraphics.Dispose()
$logoBitmap.Dispose()

Write-Output "Generated $iconPath"
Write-Output "Generated $logoPath"
