import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Slider} from 'resource:///org/gnome/shell/ui/slider.js';

const NbfcIndicator = GObject.registerClass(
class NbfcIndicator extends PanelMenu.Button {
    _init(iconPath) {
        super._init(0.0, 'NBFC Fan Control');

        let gicon = Gio.icon_new_for_string(iconPath);
        this._icon = new St.Icon({
            gicon,
            style_class: 'system-status-icon',
            icon_size: 20,
        });
        this.add_child(this._icon);

        this._autoSpeed = 30;

        // Status section
        this._statusItem = new PopupMenu.PopupBaseMenuItem({activate: false, reactive: false});
        this._statusLabel = new St.Label({text: 'Loading...'});
        this._statusLabel.clutter_text.set_line_wrap(true);
        this._statusItem.add_child(this._statusLabel);
        this.menu.addMenuItem(this._statusItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Auto toggle
        this._autoItem = new PopupMenu.PopupSwitchMenuItem('Auto Mode', true);
        this._autoItem.connect('toggled', (item, state) => {
            this._sliderItem.actor.reactive = !state;
            this._sliderItem.actor.opacity = state ? 100 : 255;
            if (state) {
                this._runCommand(['sudo', 'nbfc', 'set', '-a']);
            } else {
                this._runCommand(['sudo', 'nbfc', 'set', '-s', String(this._autoSpeed)]);
            }
        });
        this.menu.addMenuItem(this._autoItem);

        // Slider
        this._sliderItem = new PopupMenu.PopupBaseMenuItem({activate: false});
        this._slider = new Slider(0.0);
        this._slider.value = (this._autoSpeed - 30) / 70;
        this._slider.connect('notify::value', () => {
            let speed = Math.round(30 + this._slider.value * 70);
            this._autoSpeed = speed;
            this._sliderLabel.text = `Speed: ${speed}%`;
            if (!this._autoItem.state) {
                this._runCommand(['sudo', 'nbfc', 'set', '-s', String(speed)]);
            }
        });

        this._sliderLabel = new St.Label({text: `Speed: ${this._autoSpeed}%`});
        let box = new St.BoxLayout({vertical: true, x_expand: true});
        box.add_child(this._sliderLabel);
        box.add_child(this._slider);
        this._sliderItem.add_child(box);
        this._sliderItem.actor.reactive = false;
        this._sliderItem.actor.opacity = 100;
        this.menu.addMenuItem(this._sliderItem);

        // Refresh status every 3 seconds while menu is open, and once now
        this._refreshStatus();
        this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 3, () => {
            this._refreshStatus();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _refreshStatus() {
        try {
            let proc = Gio.Subprocess.new(
                ['nbfc', 'status'],
                Gio.SubprocessFlags.STDOUT_PIPE
            );
            proc.communicate_utf8_async(null, null, (proc, res) => {
                try {
                    let [, stdout] = proc.communicate_utf8_finish(res);
                    this._parseStatus(stdout);
                } catch (e) {
                    logError(e, 'NBFC status read failed');
                }
            });
        } catch (e) {
            logError(e, 'NBFC status command failed');
        }
    }

    _parseStatus(output) {
        let fans = [];
        let blocks = output.split(/\n\s*\n/);
        for (let block of blocks) {
            let nameMatch = block.match(/Fan Display Name\s*:\s*(.+)/);
            let tempMatch = block.match(/Temperature\s*:\s*([\d.]+)/);
            let curMatch = block.match(/Current Fan Speed\s*:\s*([\d.]+)/);
            let tgtMatch = block.match(/Target Fan Speed\s*:\s*([\d.]+)/);
            if (nameMatch) {
                fans.push({
                    name: nameMatch[1].trim(),
                    temp: tempMatch ? tempMatch[1] : '?',
                    cur: curMatch ? curMatch[1] : '?',
                    tgt: tgtMatch ? tgtMatch[1] : '?',
                });
            }
        }

        if (fans.length === 0) {
            this._statusLabel.text = 'No fan data';
            return;
        }

        let text = fans.map(f =>
            `${f.name}: ${f.temp}°C | Cur ${f.cur}% | Tgt ${f.tgt}%`
        ).join('\n');
        this._statusLabel.text = text;
    }

    _runCommand(argv) {
        try {
            let proc = new Gio.Subprocess({
                argv,
                flags: Gio.SubprocessFlags.NONE,
            });
            proc.init(null);
        } catch (e) {
            logError(e, 'NBFC command failed');
        }
    }

    destroy() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }
        super.destroy();
    }
});

export default class NbfcExtension extends Extension {
    enable() {
        let iconPath = `${this.path}/icons/fan.png`;
        this._indicator = new NbfcIndicator(iconPath);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
    }
}
