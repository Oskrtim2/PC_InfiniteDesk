
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class KeyboardState {
    [DllImport("user32.dll")]
    public static extern short GetAsyncKeyState(int vKey);
    public static bool IsKeyDown(int vKey) {
        return (GetAsyncKeyState(vKey) & 0x8000) != 0;
    }
}
"@
$VK_CONTROL = 0x11
$VK_E = 0x45
$VK_F = 0x46
$wasTriggered = $false
try {
    while ($true) {
        $ctrlDown = [KeyboardState]::IsKeyDown($VK_CONTROL)
        $eDown = [KeyboardState]::IsKeyDown($VK_E)
        $fDown = [KeyboardState]::IsKeyDown($VK_F)
        if ($ctrlDown -and $eDown -and $fDown) {
            if (-not $wasTriggered) {
                [Console]::WriteLine("TOGGLE")
                [Console]::Out.Flush()
                $wasTriggered = $true
            }
        }
        else {
            $wasTriggered = $false
        }
        Start-Sleep -Milliseconds 50
    }
}
catch {
    [Console]::Error.WriteLine("KeyboardMonitor Error: $($_.Exception.Message)")
    exit 1
}
