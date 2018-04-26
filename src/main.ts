import { app, BrowserWindow } from 'electron';
import * as path from 'path';

import { MenuMain } from './main/menu.main';
import { MessagingMain } from './main/messaging.main';
import { I18nService } from './services/i18n.service';

import { KeytarStorageListener } from 'jslib/electron/keytarStorageListener';
import { ElectronLogService } from 'jslib/electron/services/electronLog.service';
import { ElectronMainMessagingService } from 'jslib/electron/services/electronMainMessaging.service';
import { ElectronStorageService } from 'jslib/electron/services/electronStorage.service';
import { WindowMain } from 'jslib/electron/window.main';

export class Main {
    logService: ElectronLogService;
    i18nService: I18nService;
    storageService: ElectronStorageService;
    messagingService: ElectronMainMessagingService;
    keytarStorageListener: KeytarStorageListener;

    windowMain: WindowMain;
    messagingMain: MessagingMain;
    menuMain: MenuMain;

    constructor() {
        // Set paths for portable builds
        let appDataPath = null;
        if (process.env.BITWARDEN_APPDATA_DIR != null) {
            appDataPath = process.env.BITWARDEN_APPDATA_DIR;
        } else if (process.platform === 'win32' && process.env.PORTABLE_EXECUTABLE_DIR != null) {
            appDataPath = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'bitwarden-appdata');
        } else if (process.platform === 'linux' && process.env.SNAP_USER_DATA != null) {
            appDataPath = path.join(process.env.SNAP_USER_DATA, 'appdata');
        }

        if (appDataPath != null) {
            app.setPath('userData', appDataPath);
        }
        app.setPath('logs', path.join(app.getPath('userData'), 'logs'));

        const args = process.argv.slice(1);
        const watch = args.some((val) => val === '--watch');

        if (watch) {
            // tslint:disable-next-line
            require('electron-reload')(__dirname, {});
        }

        this.logService = new ElectronLogService(null, app.getPath('userData'));
        this.i18nService = new I18nService('en', './locales/');
        this.storageService = new ElectronStorageService();

        this.windowMain = new WindowMain(this.storageService);
        this.menuMain = new MenuMain(this);
        this.messagingMain = new MessagingMain(this.windowMain, this.menuMain);
        this.messagingService = new ElectronMainMessagingService(this.windowMain, (message) => {
            this.messagingMain.onMessage(message);
        });

        this.keytarStorageListener = new KeytarStorageListener('Bitwarden Directory Connector');
    }

    bootstrap() {
        this.keytarStorageListener.init();
        this.windowMain.init().then(async () => {
            await this.i18nService.init(app.getLocale());
            this.menuMain.init();
            this.messagingMain.init();
        }, (e: any) => {
            // tslint:disable-next-line
            console.error(e);
        });
    }
}

const main = new Main();
main.bootstrap();
