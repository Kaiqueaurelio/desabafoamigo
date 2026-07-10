# Bloqueio nativo de captura de tela (mobile)

O `ScreenshotGuard` web é apenas dissuasão — nenhum site pode impedir
capturas do sistema operacional. Para bloqueio **real** em celular, é
preciso empacotar o app com Capacitor e adicionar um plugin nativo.

## Android — FLAG_SECURE

Bloqueia screenshots do sistema e oculta a janela no seletor de apps.

```kotlin
// android/app/src/main/java/.../ScreenshotBlockerPlugin.kt
package br.com.desabafoamigo.plugins

import android.view.WindowManager
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "ScreenshotBlocker")
class ScreenshotBlockerPlugin : Plugin() {
  @PluginMethod
  fun enable(call: PluginCall) {
    activity.runOnUiThread {
      activity.window.setFlags(
        WindowManager.LayoutParams.FLAG_SECURE,
        WindowManager.LayoutParams.FLAG_SECURE,
      )
    }
    call.resolve()
  }

  @PluginMethod
  fun disable(call: PluginCall) {
    activity.runOnUiThread {
      activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
    }
    call.resolve()
  }
}
```

Registrar em `MainActivity.kt`:

```kotlin
registerPlugin(ScreenshotBlockerPlugin::class.java)
```

## iOS — não existe API pública para bloquear

O iOS **não fornece** API para impedir o Cmd+Shift do simulador nem os
botões físicos. O padrão adotado por bancos e apps de saúde é:

1. `UIScreen.capturedDidChangeNotification` → detectar gravação de tela
2. `UIApplication.userDidTakeScreenshotNotification` → detectar screenshot
3. Sobrepor uma view opaca quando o app entra em background
   (evita preview no app switcher)

```swift
// ios/App/App/ScreenshotBlockerPlugin.swift
import Capacitor
import UIKit

@objc(ScreenshotBlockerPlugin)
public class ScreenshotBlockerPlugin: CAPPlugin {
  private var overlay: UIView?

  @objc func enable(_ call: CAPPluginCall) {
    NotificationCenter.default.addObserver(
      self, selector: #selector(onScreenshot),
      name: UIApplication.userDidTakeScreenshotNotification, object: nil)
    NotificationCenter.default.addObserver(
      self, selector: #selector(showOverlay),
      name: UIApplication.willResignActiveNotification, object: nil)
    NotificationCenter.default.addObserver(
      self, selector: #selector(hideOverlay),
      name: UIApplication.didBecomeActiveNotification, object: nil)
    call.resolve()
  }

  @objc private func onScreenshot() {
    notifyListeners("screenshotTaken", data: [:])
  }

  @objc private func showOverlay() {
    DispatchQueue.main.async {
      guard let window = UIApplication.shared.windows.first else { return }
      let v = UIView(frame: window.bounds)
      v.backgroundColor = .black
      window.addSubview(v)
      self.overlay = v
    }
  }

  @objc private func hideOverlay() {
    DispatchQueue.main.async { self.overlay?.removeFromSuperview(); self.overlay = nil }
  }
}
```

## Wrapper TypeScript

```ts
// src/lib/screenshotBlocker.ts
import { registerPlugin } from "@capacitor/core";

interface ScreenshotBlockerPlugin {
  enable(): Promise<void>;
  disable(): Promise<void>;
  addListener(event: "screenshotTaken", cb: () => void): Promise<{ remove: () => Promise<void> }>;
}

export const ScreenshotBlocker = registerPlugin<ScreenshotBlockerPlugin>("ScreenshotBlocker");
```

Chamar `ScreenshotBlocker.enable()` ao entrar em `/consulta/:id` e
`.disable()` ao sair.

## Passos para ativar

1. Instalar Capacitor no projeto (`bun add @capacitor/core @capacitor/cli`)
2. `npx cap init` e adicionar plataformas Android/iOS
3. Copiar os plugins acima
4. Envolver a rota da conversa com o wrapper TS
5. Rebuild e publicar nas lojas

Enquanto o app rodar apenas em navegador, o `ScreenshotGuard` (web) é o
máximo tecnicamente possível.
