# GNOME Extensions

Personal GNOME Shell extensions. Currently includes:

## nbfc-control

A GNOME top bar extension to control [NBFC (NoteBook FanControl)](https://github.com/hirschmann/nbfc) — toggle auto mode on/off, and manually set fan speed (30–100%) via a slider. Also displays live fan temperature, current speed, and target speed for each fan.

Tested on **Ubuntu 24.04, GNOME Shell 46**.

---

### Prerequisites (fresh GNOME/Ubuntu install)

1. **Install NBFC** (NoteBook FanControl) — follow the official install guide:
   https://github.com/hirschmann/nbfc

   Quick version (Debian/Ubuntu):
```bash
   wget https://github.com/hirschmann/nbfc/releases/latest/download/nbfc-service_<version>_all.deb
   sudo dpkg -i nbfc-service_<version>_all.deb
   sudo nbfc config -a   # auto-detect and apply your laptop's fan config
```
   Verify it works:
```bash
   nbfc status
```
   You should see fan data (temperature, speed, etc). If not, find your laptop's config manually:
```bash
   sudo nbfc config -l          # list available configs
   sudo nbfc config -s "<Config Name>"
```

2. **Allow passwordless `nbfc` control** (required — the extension can't handle sudo password prompts):

   Find nbfc's path:
```bash
   which nbfc
```

   Create a sudoers rule (replace `<your-username>` and the path if different):
```bash
   sudo visudo -f /etc/sudoers.d/nbfc-nopasswd
```
   Add this line:
   <your-username> ALL=(ALL) NOPASSWD: /usr/bin/nbfc
      Save and exit. Test:
```bash
   sudo -k
   sudo nbfc set -s 50
```
   This should run without asking for a password.

---

### Installing the extension

1. Clone this repo:
```bash
   git clone https://github.com/sthanischhal207/gnome-extensions.git
   cd gnome-extensions
```

2. Copy the extension into GNOME's extensions folder:
```bash
   mkdir -p ~/.local/share/gnome-shell/extensions/nbfc-control@complete-void
   cp -r nbfc-control@complete-void/* ~/.local/share/gnome-shell/extensions/nbfc-control@complete-void/
```

3. **Log out and log back in** (required on Wayland — `Alt+F2 → r` reload only works on X11).

4. Enable the extension:
```bash
   gnome-extensions enable nbfc-control@complete-void
```

5. Click the fan icon in the top bar. You should see:
   - Live fan status (temperature, current speed, target speed)
   - An **Auto Mode** toggle
   - A **speed slider** (30–100%) when Auto Mode is off

---

### Notes

- If the fan icon doesn't appear, check extension status:
```bash
  gnome-extensions info nbfc-control@complete-void
```
  and check logs:
```bash
  journalctl --user -b 0 | grep -i nbfc
```
- Icon size can be adjusted in `extension.js` — look for `icon_size: 20` inside the `St.Icon` block.
- Status refreshes every 3 seconds automatically while the menu exists.
