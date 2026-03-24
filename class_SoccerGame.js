import { Spieler, C_BALL_ZEIT, setMobilParameters } from './spieler.js';
import { gameOptions } from './gameOptions.js';
import * as constants from './constants.js';
import * as motion from './motioncontrol.js';

// Global variables 
let strSpielstand = "";
let Ziel_Winkel = 0; // Computer schießt mit diesem
let strSpielzeit = "0:00"; // Spielzeit als Ausgabestring

const {
    SCHUSSMIN, SCHUSSMAX, ANZ_SPIELER, MAX_X, MAX_Y,
    C_SPACE_X, C_SPACE_Y, TOR_O, TOR_U, STEP, KEYS
} = constants;

export class SoccerGame {

    constructor(canvasId, options) {
        // debugger;
        // Prüfen ob die Optionen initialisiert wurden
        if (!gameOptions.isInitialized) {
            // console.log("Warte auf Optionen...");
            return;
        }
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        this.bEinzelspieler = options.einzelspieler;
        this.nameRot = options.nameRot;
        this.nameBlau = options.nameBlau;
        // Konstanten für die Mannschaftsfarben
        this.c1 = 'red';
        this.c2 = 'blue';
        this.c4 = 'black';
        this.iSpielgeschwindigkeit = options.spielgeschwindigkeit;
        this.wechselpause = options.wechselpause || 0;
        this.useKeyboard = options.useKeyboard || false;

        // Set mobile parameters if applicable
        setMobilParameters(options.actionBoost);

        // Definiert ein leeres Objekt für downKeys im Konstruktor
        this.downKeys = {};

        // Game properties
        this.MySpieler = [];
        this.spielstatus = 0; //0 nix, 1 Tor, 2 Ecke, 3 Aus, 4 rot gewonnen, 5 blau gewonnen, 6 unentschieden, 7 Abstoss
        this.schussstaerke = SCHUSSMIN;
        this.ballbesitz = 0;// 0 rot oder 1 blau nach Mannschaft

        this.mannschaft_kriegt_ball = -1; // -1 = egal; 0 rote oder 1 blaue Mannschaft
        this.SpielerMitBall = 4; // Spieler mit Ballbesitz (Nr)
        this.Ball_liegt_rum = false;  // wenn kein Spieler Ball hat ist SpielerMitBall trotzdem noch gesetzt
        this.switchPauseTimer = 0;    // Timer für Wechselpause
        this.ball_x = 375;   // Da ist der Ball aktuell
        this.ball_y = 250;
        this.ballflug_x = new Array(30); // hier werden die errechneten Zwischenwerte reingeschrieben (0 bis 29)
        this.ballflug_y = new Array(30); // hier werden die errechneten Zwischenwerte reingeschrieben (0 bis 29)
        this.ballflug_akt = 0; // index von obigem Array
        this.schusswinkel = 0;
        this.SCHRITT = 1; // Schritt pro Tastendruck bzw. Verarbeitung
        this.kollision_y = 0; // Bei Kollision y-Wert, weil Ball weg und Spieler hat nicht mehr Ball
        this.kollision_x = 0; // Bei Kollision x
        this.Ziel_Entfernung = 0; // Nur wenn <> 0 wird geschossen
        // Game flags
        this.Spiel_laeuft = false;
        this.b_kollision = false;
        this.bgSound_looping = false;  // nur einmal starten 
        this.endmusic_playing = false;  // nur einmal starten 
        this.b_30sec_isplayed = false;  // nur einmal abspielen sonst Wdh-Loop bei Tor 4:30
        this.b_halbzeit_isplayed = false;

        // Timer
        this.Am_Ball_Zeit = 0;
        this.Spielzeit = 0;
        this.SchussPause = 0; // Wenn gerade Space gedrückt wurde, darf ca. 0,5 Sec nicht geschossen werden / Spielende 4 sec / Tor 3 sec

        // Animation
        this.scaled_schuss = [];
        this.anim_zaehler = 0;  // Animation bei Tor
        this.akt_anim = 3; // Wechsel der Bilder für Spieleranimation
        this.abspannzaehler = 0; // Abspann herunterzählen
        this.kollision_anim = 0; // Bei Kollision kurz Stern anzeigen

        this.spielstandElement = document.getElementById('spielstand');
        this.spielzeitElement = document.getElementById('spielzeit');
        this.toreRotElement = document.getElementById('toreRot');
        this.toreBlauElement = document.getElementById('toreBlau');
        // Bind event listeners
        document.addEventListener('keydown', this.keyPressed.bind(this));
        document.addEventListener('keyup', this.keyReleased.bind(this));
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

        // Initialize
        this.init();

        // Füge die Variablen als Klassenattribute hinzu
        this.tore_m0 = 0; // Tore Mannschaft 0 (rot)
        this.tore_m1 = 0; // Tore Mannschaft 1 (blau)

        // Gyrosensor (nicht verwendet) und Touch Initialisierung
        this.initializeGyroAndTouch();

        // Touch-Tracking
        this.touchKeyMapping = {}; // Speichert welche Tasten durch welchen Touch-Identifier gesetzt wurden
        this.touchShootingData = {}; // Speichert Schuss-Daten pro Touch-Identifier
        this.touchStartTime = 0;
        this.touchTimeout = null;
        this.TOUCH_THRESHOLD = 100; // 0.1 Sekunden (in Millisekunden)

        // Double Tap Detection
        this.lastTapTime = 0;
    }

    handleVisibilityChange() {
        if (document.hidden) {
            Howler.mute(true);
        } else {
            if (this.Spiel_laeuft !== false) {
                Howler.mute(false);
            }
        }
    }

    // einmaliges Laden von allem
    init() {
        // Set canvas size
        this.canvas.width = MAX_X + C_SPACE_X;
        this.canvas.height = MAX_Y + C_SPACE_Y;

        // Load assets
        this.loadAssets().then(() => {
            this.initializeSpieler();
            // debugger;
            // console.log('in init');
            this.startGame();
        });
    }

    async loadAssets() {
        // Load images
        this.assets = {
            Spielers: {
                red: await Promise.all(Array(11).fill().map((_, i) => this.loadImage(`img/spieler_rot_${i}.gif`))),
                blue: await Promise.all(Array(11).fill().map((_, i) => this.loadImage(`img/spieler_blau_${i}.gif`))),
            },
            ball: await this.loadImage('img/ball.gif'),
            field: await this.loadImage('img/rasen.jpg'),
            goals: {
                left: await this.loadImage('img/tor_l.gif'),
                right: await this.loadImage('img/tor_r.gif')
            },
            BallSpielerImg_rot: await this.loadImage('img/spielermitball_rot.gif'),
            BallSpielerImg_blau: await this.loadImage('img/spielermitball_blau.gif'),
            BallImg: await this.loadImage('img/ball.gif'),
            BandeImg: await this.loadImage('img/viellieberlogo_k.jpg'),
            RasenImg: await this.loadImage('img/rasen.jpg'),
            Tor_l_Img: await this.loadImage('img/tor_l.gif'),
            Tor_r_Img: await this.loadImage('img/tor_r.gif'),
            Torstern1: await this.loadImage('img/torstern1.gif'),
            Torstern2: await this.loadImage('img/torstern2.gif'),
            krone_rot: await this.loadImage('img/spieler_rot_gross.gif'),
            krone_rot2: await this.loadImage('img/spieler_rot_gross.gif'),
            krone_blau: await this.loadImage('img/spieler_blau_gross.gif'),
            krone_blau2: await this.loadImage('img/spieler_blau_gross.gif'),
            unentschieden_img: await this.loadImage('img/unentschieden.gif'),
            SchussImg: await this.loadImage('img/schuss_img.gif'),
            kollisionImg: await this.loadImage('img/uffz.gif'),
            TastaturbelegungImg: await this.loadImage('img/tastaturbelegung.gif')
        }
        this.scaled_schuss = await this.createScaledImageArray(this.assets.SchussImg);
        this.sounds = {
            bgSound: new Howl({
                src: ['sounds/kulisse.mp3'],
                loop: true // loopen
            }),
            a_endmusic: new Howl({
                src: ['sounds/katzen.mp3'],
            }),
            a_schuss: new Howl({
                src: ['sounds/tritt.mp3']
            }),
            a_tor: new Howl({
                src: ['sounds/tor.mp3']
            }),
            a_aus: new Howl({
                src: ['sounds/aus.mp3']
            }),
            a_pfiff: new Howl({
                src: ['sounds/anpfiff.mp3']
            }),
            a_puh: new Howl({
                src: ['sounds/puh.mp3']
            }),
            a_schnell: new Howl({
                src: ['sounds/schnell.mp3']
            }),
            a_rot_gewonnen: new Howl({
                src: ['sounds/rot_gewonnen.mp3']
            }),
            a_blau_gewonnen: new Howl({
                src: ['sounds/blau_gewonnen.mp3']
            }),
            a_abzug: new Howl({
                src: ['sounds/abzug2.mp3']
            }),
            a_unentschieden1: new Howl({
                src: ['sounds/unentschieden1.mp3']
            }),
            a_unentschieden2: new Howl({
                src: ['sounds/unentschieden2.mp3']
            }),
            a_gehalten: new Howl({
                src: ['sounds/gehalten.mp3']
            }),
            a_wow: new Howl({
                src: ['sounds/wow.mp3']
            }),
            a_jou: new Howl({
                src: ['sounds/joujoujou.mp3']
            }),
            a_pfui: new Howl({
                src: ['sounds/pfui.mp3']
            }),
            a_buh: new Howl({
                src: ['sounds/buh.mp3']
            }),
            a_halbzeit: new Howl({
                src: ['sounds/halbzeit.mp3']
            }),
            a_rot: new Howl({
                src: ['sounds/rot.mp3']
            }),
            a_blau: new Howl({
                src: ['sounds/blau.mp3']
            }),
            a_ecke: new Howl({
                src: ['sounds/ecke.mp3']
            }),
            a_abstos: new Howl({
                src: ['sounds/abstos.mp3']
            }),
            a_30sec: new Howl({
                src: ['sounds/30sekunden.mp3']
            }),
            a_1min: new Howl({
                src: ['sounds/1minute.mp3']
            }),
            a_schlusspfiff: new Howl({
                src: ['sounds/schlusspfiff.mp3']
            }),
            a_kollision: new Howl({
                src: ['sounds/boing.mp3']
            })
        };
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (error) => {
                alert(`Fehler beim Laden des Bildes: ${src}`);
                console.error(`Fehler beim Laden des Bildes: ${src}`, error);
                // Optional: Platzhalterbild verwenden
                const placeholderImg = new Image();
                placeholderImg.src = 'img/spieler_rot_3.gif'; // Pfad zu einem Platzhalterbild
                placeholderImg.onload = () => resolve(placeholderImg);
                placeholderImg.onerror = () => reject(new Error(`Platzhalterbild konnte nicht geladen werden: ${placeholderImg.src}`));
            };
            img.src = src;
        });
    }
    // Methode zum Abspielen eines Sounds
    playSound(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName].play();
        }
    }
    // Funktion zum Stoppen eines Sounds
    stopSound(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName].stop();
        }
    }

    // Funktion zum Erstellen des skalierten Schuss Bild-Arrays (lieber Array als immer live berechnen)
    async createScaledImageArray(originalImage) {
        if (!originalImage || !originalImage.complete) {
            console.error('Original image not loaded');
            return [];
        }

        const myscaled_schuss = [];
        for (let i = 0; i <= (SCHUSSMAX - SCHUSSMIN); i++) {
            // Berechne die skalierten Dimensionen
            const scaleFactor = (i + SCHUSSMIN) / SCHUSSMAX;
            const newWidth = Math.round(scaleFactor * 100);
            const newHeight = Math.round(scaleFactor * 28);

            // Erstelle ein Canvas-Element für die Skalierung
            const canvas = document.createElement('canvas');
            canvas.width = newWidth;
            canvas.height = newHeight;
            const t_ctx = canvas.getContext('2d');

            // Zeichne das skalierte Bild
            t_ctx.imageSmoothingEnabled = false; // Entspricht SCALE_FAST
            t_ctx.drawImage(originalImage, 0, 0, newWidth, newHeight);

            // Erstelle und lade das skalierte Bild
            const scaledImage = new Image();

            try {
                // Warte auf das Laden des Bildes
                await new Promise((resolve, reject) => {
                    scaledImage.onload = () => {
                        resolve();
                    };
                    scaledImage.onerror = (e) => {
                        console.error(`Error loading image ${i}:`, e);
                        reject(e);
                    };
                    scaledImage.src = canvas.toDataURL();
                });

                myscaled_schuss[i] = scaledImage;
            } catch (error) {
                console.error(`Error in iteration ${i}:`, error);
            }
        }
        return myscaled_schuss;
    }

    initializeSpieler() {
        for (let i = 0; i < ANZ_SPIELER; i++) {
            this.MySpieler.push(new Spieler(this));
        }
        this.Startaufstellung(this.MySpieler, 0);
    }

    // nach jedem Tor oder bei Spielstart
    Startaufstellung(MySpieler, BallMannschaft) {
        // Initialize game state
        this.Spiel_laeuft = false; // No auto movements - Wait until key pressed
        this.ball_x = 375; // Ball in Mitte
        this.ball_y = 250;
        // Parameters: team(0/1), id, x, y, position(D/A/M/T), orientation(o/u/m), angle
        MySpieler[0].SetSpieler(0, 0, 100, 100, 'D', 'o', 0);
        MySpieler[1].SetSpieler(0, 1, 100, 400, 'D', 'u', 0);
        MySpieler[2].SetSpieler(1, 2, 750 - 100, 100, 'D', 'o', 180);
        MySpieler[3].SetSpieler(1, 3, 750 - 100, 400, 'D', 'u', 180);
        MySpieler[6].SetSpieler(0, 6, 300, 100, 'A', 'o', 0);
        MySpieler[7].SetSpieler(0, 7, 300, 400, 'A', 'u', 0);
        MySpieler[8].SetSpieler(1, 8, 450, 100, 'A', 'o', 180);
        MySpieler[9].SetSpieler(1, 9, 450, 400, 'A', 'u', 180);
        MySpieler[10].SetSpieler(0, 10, 150, 250, 'D', 'm', 0);  // new
        MySpieler[11].SetSpieler(0, 11, 300, 250, 'M', 'o', 0);  // new
        MySpieler[12].SetSpieler(1, 12, 600, 250, 'D', 'm', 180); // new
        MySpieler[13].SetSpieler(1, 13, 450, 250, 'M', 'u', 180); // new
        MySpieler[14].SetSpieler(0, 14, 0, 250, 'T', 'u', 0);    // Red goalkeeper ALWAYS 14
        MySpieler[15].SetSpieler(1, 15, MAX_X, 250, 'T', 'u', 180); // Blue goalkeeper ALWAYS 15
        MySpieler[16].SetSpieler(0, 16, 270, 230, 'M', 'm', 0);  // added 05.10.06
        MySpieler[17].SetSpieler(1, 17, 480, 270, 'M', 'm', 180); // added 05.10.06

        // Position Player of the kickoff team in the middle
        if (BallMannschaft === 0) { // Red team kicks off
            MySpieler[4].SetSpieler(0, 4, 375, 250, 'M', 'm', 0);  // This player does kickoff
            MySpieler[5].SetSpieler(1, 5, 565, 300, 'M', 'm', 180);
            this.SpielerMitBall = 4;
            this.Ball_liegt_rum = false;
            MySpieler[4].puste = 0;     // Can only pass
            MySpieler[4].sperre = true; // No self-pass
            this.Am_Ball_Zeit = 5;          // Don't fall asleep
            this.ballbesitz = 0;            // Red has ball
        } else { // Blue team kicks off
            MySpieler[4].SetSpieler(0, 4, 185, 200, 'M', 'm', 0);
            MySpieler[5].SetSpieler(1, 5, 375, 250, 'M', 'm', 180); // This player does kickoff
            this.SpielerMitBall = 5;
            this.Ball_liegt_rum = false;
            MySpieler[5].puste = 0;     // Can only pass
            MySpieler[5].sperre = true; // No self-pass
            this.Am_Ball_Zeit = 5;          // Don't fall asleep
            this.ballbesitz = 1;            // Blue has ball
        }

        // Reset game state variables
        this.mannschaft_kriegt_ball = -1;  // doesn't matter who
        this.schussstaerke = SCHUSSMIN;    // For kickoff, otherwise like before
        this.Am_Ball_Zeit = C_BALL_ZEIT;   // When goal is scored, give full time again

        // Only repaint if no goal/corner/goal kick has occurred
        if (this.spielstatus === 0) {
            this.repaint();
        }
    }



    startGame() {
        // console.log('in startGame');
        this.Spiel_laeuft = true;
        this.run();
    }

    handleGameEnd() {
        this.SchussPause = 100;
        this.Spielzeit = 0;
        this.Spiel_laeuft = false;
        this.stopSound('a_abzug');
        this.playSound('a_schlusspfiff');

        if (this.tore_m0 > this.tore_m1) {
            this.spielstatus = 4;
            this.playSound('a_rot_gewonnen');
        } else if (this.tore_m0 < this.tore_m1) {
            this.spielstatus = 5;
            this.playSound('a_blau_gewonnen');
        } else {
            this.spielstatus = 6;
            this.playSound('a_unentschieden1');
        }

        strSpielzeit = "5:00";
        // this.updateSpielzeit(strSpielzeit); 
        this.repaint();
        // aktuell keine Onlinerangliste mehr implementiert
        // Online_Ergebnis_eintragen();
    }

    // Alles zurücksetzen
    Neustart() {
        // Tore und Spielstand
        this.tore_m0 = 0;  // Tore Mannschaft 0
        this.tore_m1 = 0;  // Tore Mannschaft 1
        strSpielstand = "0 : 0";

        // Spielzeit
        this.Spielzeit = 0;
        strSpielzeit = "0:00";

        this.spielstatus = 0;
        this.abspannzaehler = 0;

        // Kollision und Animation
        this.b_kollision = false;
        this.anim_zaehler = 0;  // Wechsel der Bilder für Tor-Animation

        // Zielparameter
        Ziel_Winkel = 0;    // Computer schießt mit diesem
        this.Ziel_Entfernung = 0;  // Nur wenn <> 0 wird geschossen

        // Animation und Ballflug
        this.akt_anim = 3;  // In der Mitte anfangen
        this.ballflug_akt = 0;  // aktuelle Ballposition im Array
        this.ballflug_x[0] = -1;  // Abbruchbedingung, keine Ballbewegung

        // Spieleraufstellung
        this.Startaufstellung(this.MySpieler, 0);

        // Touch-Reset
        this.resetTouchState();

        // Audio-Handling
        if (this.endmusic_playing) {
            this.stopSound('a_endmusic');
            this.endmusic_playing = false;
        }
        this.b_30sec_isplayed = false;  // nur einmal abspielen sonst Wdh-Loop bei Tor 4:30
        this.b_halbzeit_isplayed = false;
        this.b_1min_isplayed = false;
    }

    run() {
        let i;
        let kTor; // where is the ball?
        let startTime = 0;
        let runTime = 0;

        // console.log('in run');
        // Background sound handling
        if (!this.bgSound_looping) {
            this.bgSound_looping = true;
            this.playSound('bgSound');
        }

        const gameLoop = () => {
            startTime = Date.now();
            if (this.SchussPause > 0) {  // Egal ob Spiel läuft oder nicht, sonst wird die Schleife nicht beendet
                this.SchussPause -= 1;
            }
            if (this.switchPauseTimer > 0) {
                console.log('switchPauseTimer ' + this.switchPauseTimer);
                this.switchPauseTimer -= 1;
            }
            this.tastatursteuerung();
            if (this.Spiel_laeuft) {
                if (this.switchPauseTimer <= 0) {
                    // debugger;
                    // If computer team has the ball and single player mode
                    if (this.bEinzelspieler === true) {
                        if (this.ballbesitz === 1) { // Blau am Ball
                            if (this.Ball_liegt_rum === false) {
                                if (this.MySpieler[this.SpielerMitBall].puste > 0) {
                                    if (this.ball_x > 140) { // maximale Schussstaerke * 2 in ballflug()
                                        this.Aktion_LEFT();
                                    }
                                    if (this.ball_x < 350) { // Erst ab hier Richtung Mitte laufen
                                        if (this.ball_y < 200) {
                                            this.Aktion_DOWN();
                                        } else {
                                            if (this.ball_y > 300) {
                                                this.Aktion_UP();
                                            }
                                        }
                                    } // Ende Richtung Mitte laufen
                                    if (this.Ziel_Entfernung > 0) {
                                        this.Pass_ausfuehren();
                                    } else {
                                        // Wenn Torschuss moeglich
                                        if ((this.ball_x <= 145) && ((this.ball_y >= 180) && (this.ball_y <= 320))) {
                                            this.Torschuss_errechnen();
                                        }
                                    }
                                } else { // Spieler hat keine Puste mehr, kann also nicht mehr laufen
                                    if (this.Ziel_Entfernung > 0) {
                                        this.Pass_ausfuehren();
                                    } else {
                                        if ((this.ball_x <= 145) && ((this.ball_y >= 180) && (this.ball_y <= 320))) { // Wenn Torschuss moeglich
                                            this.Torschuss_errechnen();
                                        } else {
                                            if (this.spielstatus === 2) { // Ecke
                                                this.Ecke_errechnen();
                                            } else {
                                                if (this.Am_Ball_Zeit < 2) { // Nix in der Nähe? Dann Versuch einer Selbstvorlage, wenn keine Sperre
                                                    if (this.MySpieler[this.SpielerMitBall].sperre === false) { // Torhüter sollte sperre haben
                                                        Ziel_Winkel = 180;
                                                        this.Ziel_Entfernung = SCHUSSMIN;
                                                    } else {
                                                        this.Torschuss_errechnen(); // Nix in Nähe und Sperre, wird wohl nicht klappen
                                                    }
                                                } else {
                                                    this.Pass_erechnen();
                                                }
                                            }
                                        }
                                    }
                                } // Spieler hat (keine) Puste
                            } // Ball ist am Mann
                        } // Ende Computerspieler berrechnen // Einzelspieler
                    }
                    // Move all players
                    for (i = 0; i < ANZ_SPIELER; i++) {
                        this.MySpieler[i].bewege_auto();
                    }

                    // Draw ball flight path
                    if (this.Ball_liegt_rum && this.ballflug_x[this.ballflug_akt] !== -1) {
                        this.ballflug_akt++;

                        if (this.ballflug_x[this.ballflug_akt] !== -1) {
                            if (this.ballflug_x[this.ballflug_akt] > MAX_X || this.ballflug_x[this.ballflug_akt] < 0
                                || this.ballflug_y[this.ballflug_akt] > MAX_Y || this.ballflug_y[this.ballflug_akt] < 0) {
                                this.ball_x = this.ballflug_x[this.ballflug_akt];
                                this.ball_y = this.ballflug_y[this.ballflug_akt];
                                kTor = this.wo_ist_Ball();
                                this.Ball_am_Ziel(kTor);
                            } else {
                                this.ball_x = this.ballflug_x[this.ballflug_akt];
                                this.ball_y = this.ballflug_y[this.ballflug_akt];
                                kTor = this.wo_ist_Ball();
                                this.Ball_am_Ziel(kTor);
                            }
                        } else {
                            this.ballflug_x[0] = -1;
                        }
                    }

                    this.repaint();

                    // Handle collision
                    if (this.b_kollision) {
                        this.b_kollision = false; // first false to avoid second collision
                        this.kollision_anim = 10;
                        this.kollision_y = this.ball_y - 8;
                        this.kollision_x = this.ball_x - 16;
                        this.playSound('a_kollision');
                        this.schuss();
                    }

                    // Animate players
                    this.akt_anim = this.akt_anim >= 10 ? 0 : this.akt_anim + 1;
                }

            } else {  // Game is not running
                if (this.anim_zaehler > 0) {
                    this.anim_zaehler--;
                } else {
                    this.anim_zaehler = 10;
                }

                // Credits sequence
                if (this.spielstatus === 4 || this.spielstatus === 5 || this.spielstatus === 6) {
                    if (this.abspannzaehler < 1030) {
                        if (!this.endmusic_playing) {
                            this.playSound('a_endmusic');
                            this.endmusic_playing = true;
                        }
                        this.abspannzaehler++;
                    } else {
                        this.abspannzaehler = 0;
                    }
                }
                this.repaint();
            }

            if (this.kollision_anim > 0) {
                this.kollision_anim--;
            }

            // Calculate frame timing
            runTime = Date.now() - startTime;

            // Request next frame with proper timing
            if (runTime < this.iSpielgeschwindigkeit) {
                setTimeout(gameLoop, this.iSpielgeschwindigkeit - runTime);
            } else {
                requestAnimationFrame(gameLoop);
            }
        };

        // Start the game loop
        gameLoop();

        // Ball possession time counter
        const ballPossessionTimer = setInterval(() => {
            if (!this.Ball_liegt_rum && this.Spiel_laeuft && this.switchPauseTimer <= 0) {
                this.Am_Ball_Zeit--;
                // console.log("Am_Ball_Zeit " + this.Am_Ball_Zeit);
                // this.updateAmBallZeit(this.Am_Ball_Zeit);
                if (this.Am_Ball_Zeit === 3) {
                    this.playSound('a_schnell');
                }
            }
            if (this.Am_Ball_Zeit <= 0) {
                this.schussstaerke = SCHUSSMAX;
                this.schuss();
                this.Am_Ball_Zeit = C_BALL_ZEIT;
            }
        }, 1000);

        // Game time counter
        const gameTimer = setInterval(() => {  // Alle Sekunde
            if (this.Spiel_laeuft && this.switchPauseTimer <= 0) {
                this.Spielzeit = this.Spielzeit + 1;
                strSpielzeit = Math.floor(this.Spielzeit / 60) + ":";
                strSpielzeit += (this.Spielzeit % 60).toString().padStart(2, '0');
            }

            if (this.Spielzeit === 150) { // Halbzeit - nur Sound kein Seitenwechsel
                if (!this.b_halbzeit_isplayed) { // sonst Endlosschleife bei Tor
                    this.b_halbzeit_isplayed = true;
                    this.playSound('a_halbzeit');
                }
            }
            if (this.Spielzeit === 240) { // Noch 1 Minute
                if (!this.b_1min_isplayed) {
                    this.b_1min_isplayed = true;
                    this.playSound('a_1min');
                }
            }
            if (this.Spielzeit === 270) { // Noch 30 sec
                if (!this.b_30sec_isplayed) {
                    this.b_30sec_isplayed = true;
                    this.playSound('a_30sec');
                }
            }
            if (this.Spielzeit === 300) { // 300 Zeit abgelaufen = 5 Minuten
                // this.tore_m0 = 1; // für Test Rot/Blau Sieg
                // this.tore_m1 = 1; // für Test Rot/Blau Sieg
                this.SchussPause = 100; // 4 Sekunden Damit das Spiel nicht gleich wieder losgeht
                this.Spielzeit = 0; // Damit nicht immer wieder diese Schleife aufgerufen wird
                this.Spiel_laeuft = false;
                this.stopSound('a_abzug'); // Aufziehsound beenden, ist meist noch zu hören

                this.playSound('a_schlusspfiff');
                if (this.tore_m0 > this.tore_m1) {
                    this.spielstatus = 4; // "rot_sieger";
                    this.playSound('rot_gewonnen');
                } else {
                    if (this.tore_m0 < this.tore_m1) {
                        this.spielstatus = 5; // "blau_sieger";
                        this.playSound('blau_gewonnen');
                    } else {
                        this.spielstatus = 6; // "unentschieden";
                        this.playSound('unentschieden1');
                    }
                }
                this.strSpielzeit = "5:00";
                this.repaint(); // Wenn Spiel nicht läuft wird sonst nix mehr gemalt
                // Hier für Onlneergebnisse Spieldaten an CGI auf Webserver übermitteln
                // this.Online_Ergebnis_eintragen();
            }
        }, 1000);

        // Return cleanup function (reset setInterval())
        return () => {
            clearInterval(ballPossessionTimer);
            clearInterval(gameTimer);
        };
    }

    repaint() {
        // Clear canvas - hier die gesammte Breite des Bildschirms
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // console.log('c-width ' + this.canvas.width + ' c-height ' + this.canvas.height);  
        // Draw field
        this.drawField();

        // Draw the touchable area around the goals
        this.drawTouchableArea();

        // Draw arrows for rotation
        if (this.ballbesitz === 0) {
            this.drawArrows(); // Pfeile zeichnen
        } else {
            if (this.bEinzelspieler === false) {
                this.drawArrows(); // Pfeile zeichnen
            }
        }
        this.drawScore(); // Spielstand anzeigen
        this.drawTotalTime(); // Gesamtzeit anzeigen
        this.drawBall();
        this.Spieler_Zeichnen();
        this.drawToranimation();
        this.drawGewinnanimation();

        // Pause overlay
        if (this.switchPauseTimer > 0) {
            console.log('Pause overlay ' + this.switchPauseTimer);
            this.ctx.fillStyle = this.ballbesitz === 0 ? 'rgba(255, 0, 0, 0.4)' : 'rgba(0, 0, 255, 0.4)';
            this.ctx.fillRect(0 + C_SPACE_X / 2, 0 + C_SPACE_Y / 2, MAX_X, MAX_Y);
        }

        if (!this.Spiel_laeuft) { // Anstoss?
            if (this.SchussPause === 0) {
                // kein rot/blau Sieg oder unentschieden
                if (this.spielstatus !== 4 && this.spielstatus !== 5 && this.spielstatus !== 6) {
                    if (this.spielstatus === 0) {
                        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; // Schwarz mit 20% Transparenz
                        this.ctx.font = '24px Arial';
                        this.ctx.fillText("Press Key or Touch", MAX_X / 2 - 50, MAX_Y - 50); // unten
                    }
                } else {
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; // Schwarz mit 20% Transparenz
                    this.ctx.font = '22px Arial';
                    this.ctx.fillText("Restart with Key or Touch", MAX_X - 240, 50); // rechts
                }
            }
        }
    }

    drawField() {
        // Draw grass background
        this.ctx.drawImage(this.assets.field, 0 + C_SPACE_X / 2, 0 + C_SPACE_Y / 2, MAX_X, MAX_Y);

        // Draw goals (Torbreite 13 Pixel)
        this.ctx.drawImage(this.assets.goals.left, 0 + C_SPACE_X / 2 - 13, TOR_O + C_SPACE_Y / 2);
        this.ctx.drawImage(this.assets.goals.right, MAX_X + C_SPACE_X / 2, TOR_O + C_SPACE_Y / 2);
    }

    drawBall() {
        if (this.Ball_liegt_rum == true) { // dann Ball einzeln zeichnen (sonst ist er am Spieler)
            this.ctx.drawImage(
                this.assets.ball,
                this.ball_x + C_SPACE_X / 2 - this.assets.ball.width / 2,
                this.ball_y + C_SPACE_Y / 2 - this.assets.ball.height / 2
            );
        }
    }

    drawScore() {
        // Berechnung der X-Positionen für Spielstand mit 20 Pixel Abstand
        const leftScoreX = (MAX_X / 2) + C_SPACE_X / 2 - 24; // Position für rote Tore
        const rightScoreX = (MAX_X / 2) + C_SPACE_X / 2 + 10; // Position für blaue Tore

        // Zeichne rote erziehlte Tore
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.6)'; // Rot mit 50% Transparenz
        this.ctx.font = '28px Arial';
        this.ctx.fillText(`${this.tore_m0}`, leftScoreX, 40);

        // Zeichne blaue erziehlte Tore
        this.ctx.fillStyle = 'rgba(0, 0, 255, 0.6)'; // Blau mit 50% Transparenz
        this.ctx.font = '28px Arial';
        this.ctx.fillText(`${this.tore_m1}`, rightScoreX, 40);
    }

    drawTotalTime() {
        // Gesamtzeit in einem grauen Kasten anzeigen
        const totalTimeX = MAX_X - 30; // X-Position für die Gesamtzeit
        const totalTimeY = 40; // Y-Position für die Gesamtzeit
        const boxWidth = 60; // Breite des Kastens
        const boxHeight = 36; // Höhe des Kastens

        // Grauer Kasten
        this.ctx.fillStyle = 'rgba(128, 128, 128, 0.4)'; // Grau mit 60% Transparenz
        this.ctx.fillRect(totalTimeX, totalTimeY - boxHeight + 6, boxWidth, boxHeight);

        // Schriftfarbe für die Gesamtzeit
        this.ctx.fillStyle = '#FFFFFF'; // Weiß
        this.ctx.font = '28px Arial';
        this.ctx.fillText(strSpielzeit, totalTimeX + 4, totalTimeY); // Gesamtzeit
    }

    // Zeichne Pfeile für Rotation
    drawArrows() {
        const arrowWidth = 34; // Breite des Pfeils
        const arrowHeight = 60; // Höhe des Pfeils
        const arrowYUp = TOR_O - C_SPACE_Y / 2 - arrowHeight - 40; // Y-Position für den oberen Pfeil
        const arrowYDown = TOR_U - C_SPACE_Y / 2 + arrowHeight + 70; // Y-Position für den unteren Pfeil
        let arrowX;
        let colorArrowUp = '#FFFFFF';
        let colorArrowDown = '#FFFFFF';

        if (this.ballbesitz === 0) {
            // arrowX = MAX_X + C_SPACE_X / 2 + arrowWidth + 2; // X-Position der Pfeile
            arrowX = MAX_X + C_SPACE_X / 2 + C_SPACE_X / 4; // Mittig im rechten Rand
            if (this.downKeys[KEYS.P_UP]) {
                colorArrowUp = '#FF4444'; // Rot
            } else {
                if (this.downKeys[KEYS.P_DOWN]) {
                    colorArrowDown = '#FF4444'; // Rot
                }
            }
        } else {
            // arrowX = 0 + C_SPACE_Y / 2 + arrowWidth - 2; // X-Position der Pfeile (10 Pixel Abstand vom Tor)
            arrowX = C_SPACE_X / 4; // Mittig im linken Rand
            if (this.downKeys[KEYS.P_UP]) {
                colorArrowDown = '#4444ff'; // Blau
            } else {
                if (this.downKeys[KEYS.P_DOWN]) {
                    colorArrowUp = '#4444ff'; // Blau
                }
            }
        }

        if (this.ballbesitz === 0
            || (!this.bEinzelspieler && this.ballbesitz === 1)) {
            // Pfeil nach oben zeichnen
            this.ctx.fillStyle = colorArrowUp;
            this.ctx.beginPath();
            this.ctx.moveTo(arrowX, arrowYUp);
            this.ctx.lineTo(arrowX - arrowWidth, arrowYUp + arrowHeight); // linke Ecke zu Spitze
            this.ctx.lineTo(arrowX + arrowWidth, arrowYUp + arrowHeight);
            this.ctx.closePath();
            this.ctx.fill();

            // Pfeil nach unten zeichnen
            this.ctx.fillStyle = colorArrowDown;
            this.ctx.beginPath();
            this.ctx.moveTo(arrowX, arrowYDown);
            this.ctx.lineTo(arrowX - arrowWidth, arrowYDown - arrowHeight);
            this.ctx.lineTo(arrowX + arrowWidth, arrowYDown - arrowHeight);
            this.ctx.closePath();
            this.ctx.fill();
        }
    }

    drawToranimation() {
        if (this.spielstatus === 1) {  // Toranimation gleich fuer rot/blau
            // System.out.println(status);
            if (this.anim_zaehler > 5) {
                this.ctx.drawImage(this.assets.Torstern1, MAX_X / 2 - 200, MAX_Y / 2 - 200);
            } else {
                this.ctx.drawImage(this.assets.Torstern2, MAX_X / 2 - 195, MAX_Y / 2 - 195);
            }
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Schwarz mit 50% Transparenz
            this.ctx.font = '24px Arial';
            this.ctx.fillText("Press Key or Touch", MAX_X / 2 - 50, MAX_Y - 50); // unten
        }
    }

    drawGewinnanimation() {
        switch (this.spielstatus) {
            case 4: // rot Sieger
                if (this.anim_zaehler > 5) {
                    this.ctx.drawImage(this.assets.krone_rot, 120, 100);  // Sieg rot
                } else {
                    this.ctx.drawImage(this.assets.krone_rot2, 112, 92);  // Torerfolg
                }
                this.abspann_zeichnen(); // Hier Abspann
                break; // Ende rot_sieger

            case 5: // blau Sieger
                if (this.anim_zaehler > 5) {
                    this.ctx.drawImage(this.assets.krone_blau, 450, 100);
                } else {
                    this.ctx.drawImage(this.assets.krone_blau2, 442, 92);
                }
                this.abspann_zeichnen(); // Hier Abspann
                break; // Ende blau_sieger

            case 6: // "unentschieden"
                if (this.anim_zaehler > 5) {
                    this.ctx.drawImage(this.assets.krone_rot, 120, 100);
                    this.ctx.drawImage(this.assets.krone_blau, 450, 100);
                    this.ctx.drawImage(this.assets.unentschieden_img, MAX_X / 2 - 250, 350);
                } else {
                    this.ctx.drawImage(this.assets.krone_rot2, 112, 92);
                    this.ctx.drawImage(this.assets.krone_blau2, 442, 92);
                    this.ctx.drawImage(this.assets.unentschieden_img, MAX_X / 2 - 250, 350);
                }
                this.abspann_zeichnen(); // Hier Abspann
                break; // Ende unentschieden
        }
    }

    // Zeichnen der drückbaren Fläche um die Tore
    drawTouchableArea() {

        const touchAreaHeight = MAX_Y + C_SPACE_Y; // Ganze Höhe
        const touchAreaWidth = C_SPACE_X / 2; // Breite der drückbaren Fläche

        if (!this.downKeys[KEYS.SPACE]) {
            this.ctx.fillStyle = 'rgba(128, 128, 128, 0.5)'; // Grau mit 50% Transparenz
        } else {
            if (this.ballbesitz === 0) {
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // Rot mit 50% Transparenz
            } else {
                this.ctx.fillStyle = 'rgba(0, 0, 255, 0.5)'; // Blau mit 50% Transparenz
            }
        }
        // zeichne Linke drückbare Fläche (für die rote Mannschaft)
        if (this.ballbesitz === 0)
            this.ctx.fillRect(0, 0 + C_SPACE_Y / 2, touchAreaWidth, touchAreaHeight - C_SPACE_Y);
        // zeichne Rechte drückbare Fläche (für die blaue Mannschaft)
        if (this.ballbesitz === 1 && !this.bEinzelspieler) {
            this.ctx.fillRect(MAX_X + C_SPACE_X / 2, 0 + C_SPACE_Y / 2, touchAreaWidth, touchAreaHeight - C_SPACE_Y);
        }
    }

    schuss() {
        this.Ziel_Entfernung = 0;  // Computer this.Ziel_Entfernung nullen    
        // Auf jeden Fall kurze Schusspause nach jedem Schuss
        this.SchussPause = 25; // ca. 25*40ms = 1 Sec.
        this.stopSound('a_abzug'); // Aufziehsound beenden
        // bewegt sich wieder automatisch, kann nicht gesteuert werden
        this.Ball_liegt_rum = true;
        // kTor = 
        this.ballflug(this.MySpieler[this.SpielerMitBall].winkel, this.schussstaerke);
        this.schussstaerke = SCHUSSMIN;
    }

    // Ist Ball ist am Ziel? Bestimmen was passieren soll: Tor zählen, nächster Spieler bestimmen, aus, ...
    //spielstatus(!=kTor) 0 nix, 1 Tor, 2 Ecke, 3 Aus, 4 rot gewonnen, 5 blau gewonnen, 6 unentschieden, 7 Abstoss
    Ball_am_Ziel(kTor) {
        // Achtung, wenn Ball aus, muss andere Mannschaft ran
        // Es sei denn es fiel ein Tor
        // debugger;
        switch (kTor) {
            case -1:
                if (this.ballflug_x[this.ballflug_akt + 1] === -1) {
                    this.SpielerMitBall = this.NaehesterSpieler();
                }
                break;
            case 0:
            case 1:
                this.tor_gefallen(kTor);
                break;
            case 2: // Aus
            case 5: // Aus
            case 6: // Aus
            case 7: // Aus
            case 8: // Aus
                if (this.spielstatus === 2) { // Ecke
                    this.playSound('ecke');
                } else {
                    this.playSound('aus');
                }
                this.SpielerMitBall = this.NaehesterSpieler();
                this.MySpieler[this.SpielerMitBall].puste = 0;  // Einwurf
                this.MySpieler[this.SpielerMitBall].sperre = true;  // Darf sich nicht selbst einwerfen
                break;
            case 3: // Blauer Torwart hält
                this.playSound('gehalten');
                this.SpielerMitBall = 15;
                this.MySpieler[this.SpielerMitBall].ziel_x = this.ball_x;
                this.MySpieler[this.SpielerMitBall].ziel_y = this.ball_y;
                this.MySpieler[this.SpielerMitBall].puste = 0;  // Abstoß
                this.MySpieler[this.SpielerMitBall].sperre = true;
                break;
            case 4: // Roter Torwart hält
                this.playSound('gehalten');
                this.SpielerMitBall = 14;
                this.MySpieler[this.SpielerMitBall].ziel_x = this.ball_x;
                this.MySpieler[this.SpielerMitBall].ziel_y = this.ball_y;
                this.MySpieler[this.SpielerMitBall].puste = 0;  // Abstoß
                this.MySpieler[this.SpielerMitBall].sperre = true;
                break;
        }
    }

    // nur aufrufen, wenn ein Tor gefallen ist
    tor_gefallen(myTor) {
        this.schussPause = 75;  // 75*40 ms = 3 Sekunden Nach Tor erst warten, bevors weitergeht
        this.playSound('a_tor');

        switch (myTor) {
            case 0:
                this.spielstatus = 1;  // "tor"
                this.Startaufstellung(this.MySpieler, 1);
                break;

            case 1:
                this.spielstatus = 1;  // "tor"
                this.Startaufstellung(this.MySpieler, 0);
                break;

            default:
                console.log("Fehler bei tor_gefallen");
        }
    }

    // berechnen tun wir auf 750x500 beim Zeichnen aber um den Rand verschieben
    Spieler_Zeichnen() {  // ctx ist der Canvas 2D Context
        let i;
        // debugger;
        switch (this.spielstatus) { // Spieler hüpfen lassen
            case 4: // rot Sieger
                for (i = 0; i < ANZ_SPIELER; i++) {
                    this.ctx.save();
                    this.ctx.translate(this.MySpieler[i].pos_x + C_SPACE_X / 2,
                        this.MySpieler[i].pos_y + C_SPACE_Y / 2);
                    switch (this.MySpieler[i].Mannschaft) {
                        case 0:
                            // this.anim_zaehler 1..10
                            this.ctx.drawImage(this.assets.Spielers.red[this.akt_anim], -16 + this.anim_zaehler, -16 + this.anim_zaehler);
                            break;
                        case 1:
                            this.ctx.rotate(-Math.PI); // 180 Grad in Radianten
                            this.ctx.drawImage(this.assets.Spielers.blue[this.akt_anim], -16, -16);
                            break;
                    }
                    this.ctx.restore();
                }
                break;

            case 5: // blau Sieger
                for (i = 0; i < ANZ_SPIELER; i++) {
                    this.ctx.save();
                    this.ctx.translate(this.MySpieler[i].pos_x + C_SPACE_X / 2,
                        this.MySpieler[i].pos_y + C_SPACE_Y / 2);
                    switch (this.MySpieler[i].Mannschaft) {
                        case 0:
                            this.ctx.drawImage(this.assets.Spielers.blue[this.akt_anim], -16 + this.anim_zaehler, -16 + this.anim_zaehler);
                            break;
                        case 1:
                            this.ctx.rotate(-Math.PI); // 180 Grad in Radianten
                            this.ctx.drawImage(this.assets.Spielers.red[this.akt_anim], -16, -16);
                            break;
                    }
                    this.ctx.restore();
                }
                break;

            default: // Standard - niemand hat gewonnen
                if (!this.Ball_liegt_rum) {
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = this.MySpieler[this.SpielerMitBall].Mannschaft === 0 ? this.c1 : this.c2;
                    this.ctx.lineWidth = 3;
                    this.ctx.moveTo(this.MySpieler[this.SpielerMitBall].pos_x -
                        (this.MySpieler[this.SpielerMitBall].puste / 4) + C_SPACE_X / 2,
                        this.MySpieler[this.SpielerMitBall].pos_y - 16);
                    this.ctx.lineTo((this.MySpieler[this.SpielerMitBall].puste / 2) +
                        this.MySpieler[this.SpielerMitBall].pos_x -
                        (this.MySpieler[this.SpielerMitBall].puste / 4) + C_SPACE_X / 2,
                        this.MySpieler[this.SpielerMitBall].pos_y - 16);
                    this.ctx.stroke();
                    // Am Ball Zeit anzeigen
                    this.ctx.font = '16px Arial';
                    if (this.ballbesitz === 0) {
                        this.ctx.fillStyle = 'rgba(255, 0, 0, 1)'; // Rot für die rote Mannschaft
                    } else {
                        this.ctx.fillStyle = 'rgba(0, 0, 255, 1)'; // Blau für die blaue Mannschaft
                    }
                    // unter den Spieler
                    this.ctx.fillText(this.Am_Ball_Zeit,
                        this.MySpieler[this.SpielerMitBall].pos_x - 6 + C_SPACE_X / 2,
                        this.MySpieler[this.SpielerMitBall].pos_y + C_SPACE_Y / 2 + 24);
                }
                for (i = 0; i < ANZ_SPIELER; i++) {
                    this.ctx.save();
                    this.ctx.translate(this.MySpieler[i].pos_x + C_SPACE_X / 2, this.MySpieler[i].pos_y + C_SPACE_Y / 2);
                    this.ctx.rotate(-this.MySpieler[i].winkel * Math.PI / 180);

                    if (this.MySpieler[i].Mannschaft === 0) { // rot
                        if (!this.Ball_liegt_rum && i === this.SpielerMitBall) {
                            this.ctx.drawImage(this.assets.BallSpielerImg_rot, -8, -8);
                            this.ctx.beginPath();
                            this.ctx.strokeStyle = this.MySpieler[this.SpielerMitBall].Mannschaft === 0 ? this.c1 : this.c2;
                            this.ctx.arc(0, 0, 22, 0, 2 * Math.PI);
                            // this.ctx.arc(-22, -22, 22, 0, 2 * Math.PI);
                            this.ctx.stroke();
                        } else {
                            this.ctx.drawImage(this.assets.Spielers.red[this.akt_anim], -8, -8);
                        }
                    } else { // blau
                        if (!this.Ball_liegt_rum && i === this.SpielerMitBall) {
                            this.ctx.drawImage(this.assets.BallSpielerImg_blau, -8, -8);
                            this.ctx.beginPath();
                            this.ctx.strokeStyle = this.MySpieler[this.SpielerMitBall].Mannschaft === 0 ? this.c1 : this.c2;
                            this.ctx.arc(0, 0, 22, 0, 2 * Math.PI);
                            // this.ctx.arc(-22, -22, 22, 0, 2 * Math.PI);
                            this.ctx.stroke();
                        } else {
                            this.ctx.drawImage(this.assets.Spielers.blue[this.akt_anim], -8, -8);
                        }
                    }

                    if (!this.Ball_liegt_rum && i === this.SpielerMitBall &&
                        this.schussstaerke > SCHUSSMIN) {
                        this.ctx.drawImage(this.scaled_schuss[this.schussstaerke - SCHUSSMIN], 14, -4 - this.schussstaerke / 6);
                    }
                    this.ctx.restore();
                }
        }
    }

    abspann_zeichnen() {
        this.ctx.fillStyle = this.c4; // Schwarz
        this.ctx.font = '16px Arial';  // Schriftart festlegen

        const credits = [
            ["PROJECT MANAGEMENT", "Ralf Viellieber"],
            ["GAME PROGRAMMER", "R. Viellieber"],
            ["ENGINE PROGRAMMER", "Ralf V."],
            ["CROSS-PLATFORM INTEGRATION SPECIALIST", "R.V."],
            ["ART DIRECTOR", "Ralf Viellieber"],
            ["ANIMATIONS", "R. Viellieber"],
            ["SOUND DESIGN", "Ralf V."],
            ["BETA TESTER", "Till, Tobi Z., Conan, Steffi,"],
            ["", "Leo († 13.02.2023 RIP)"],
            ["MUSIC", "Ralf & Friends"],
            ["PLEASE VISIT - http://www.viellieber.de", ""]
        ];
        // console.log('abspannzaehler in abspann ' + this.abspannzaehler);
        credits.forEach((credit, index) => {
            this.ctx.fillText(credit[0], 90, 600 + index * 40 - this.abspannzaehler);
            this.ctx.fillText(credit[1], 460, 600 + index * 40 - this.abspannzaehler);
        });
    }

    // wenn Ballbesitz sich durch Aus, Ecke, gehalten oder Tor ändert
    switch_ballbesitz() {
        // Touch-Reset bei Ballbesitzwechsel
        this.resetTouchState();

        if (this.ballbesitz === 0) {
            this.mannschaft_kriegt_ball = 1;
        } else {
            this.mannschaft_kriegt_ball = 0;
        }
        // console.log('switch_ballbesitz ' + this.ballbesitz + ' kriegt Ball ' + this.mannschaft_kriegt_ball) + ' status' + this.spielstatus;
        // bei Tor nicht pfui, aber bei gehalten, Aus und Ecke
        if (this.spielstatus !== 1) {
            this.playSound('a_pfui');
        }
    }

    // nur für wechselpause
    getBallbesitz(iMannschaft) {
        if (this.ballbesitz !== iMannschaft) {
            this.ballbesitz = iMannschaft;
            if (this.wechselpause > 0) {
                // Pause in Frames umgerechnet
                this.switchPauseTimer = this.wechselpause * (1000 / this.iSpielgeschwindigkeit);
                console.log('wechselpause ' + this.wechselpause + ' ' + this.iSpielgeschwindigkeit + ' ' + this.switchPauseTimer);
            }
        }
    }

    // Ball flight calculation
    ballflug(w, zug) {
        let my_w;
        let zufall;
        let x, y;
        let steps;
        let x_beweg, y_beweg;

        // Play shot sound
        this.playSound('a_schuss');

        // Add random angle variation
        if (!this.b_kollision) {
            zufall = Math.floor(Math.random() * 16) - 8; // -8 to +7 degrees
        } else {
            zufall = Math.floor(Math.random() * 180) - 90; // -90 to +89 degrees
            zug += 10;
        }

        my_w = w + zufall;
        zug += Math.floor(this.MySpieler[this.SpielerMitBall].puste / 5); // kriegt für Puste noch was drauf

        // Torhüter oder Ecke doppelt so weit
        if (this.MySpieler[this.SpielerMitBall].Typ === 'T' || this.spielstatus === 2 || this.spielstatus === 7) {
            zug = zug * 2;
            this.spielstatus = 0;
        }

        this.schusswinkel = my_w;

        // Calculate ball flight
        x = Math.round(2.0 * zug * Math.cos(my_w * Math.PI / 180));
        y = Math.round(2.0 * zug * Math.sin(my_w * Math.PI / 180));

        steps = Math.floor((2.0 * zug) / 20);

        x_beweg = x / steps;
        y_beweg = y / steps;

        this.ballflug_akt = 0;
        this.ballflug_x[0] = this.ball_x;
        this.ballflug_y[0] = this.ball_y;

        for (let i = 1; i <= steps; i++) {
            this.ballflug_x[i] = this.ballflug_x[0] + Math.round(i * x_beweg);
            this.ballflug_y[i] = this.ballflug_y[0] - Math.round(i * y_beweg);

            // Check if ball is out of bounds
            if (this.ballflug_x[i] > MAX_X || this.ballflug_x[i] < 0 ||
                this.ballflug_y[i] > MAX_Y || this.ballflug_y[i] < 0) {
                steps = i;
                break;
            }
        }

        // Set end markers
        this.ballflug_x[steps + 1] = -1;
        this.ballflug_y[steps + 1] = -1;
    }

    //Tor gefallen? Aus? Hält Torwart?
    //Gibt -1 für kein Tor, 0 Tor für Mannschaft 0, 1 für Tor Mannschaft 1, 2 für Aus, 3 für blau hält,
    //4 für rot hält, 5 Links oben Ecke, 6 Links unten Ecke, 7 Rechts oben Ecke, 8 Rechts unten
    //Ecke zurück
    //Wenn Ball +/-8 vom Torwart einschlägt, hat dieser gehalten
    wo_ist_Ball() {
        let l_y;
        let l_x;
        let wo = -1;

        // Rechts aus oder Tor
        if (this.ball_x > MAX_X) {
            this.switch_ballbesitz();
            if (this.schusswinkel % 90 === 0) {
                this.schusswinkel += 1;
            }
            // Schnittpunkt mit Linie errechnen
            l_y = Math.round((MAX_X - this.ballflug_x[this.ballflug_akt - 1]) *
                Math.tan(this.schusswinkel * Math.PI / 180));
            this.ball_x = MAX_X;
            this.ball_y = this.ballflug_y[this.ballflug_akt - 1] - l_y;

            if (this.ball_y > TOR_O && this.ball_y < TOR_U) {  // Ball in Tor
                if (Math.abs(this.ball_y - this.MySpieler[15].pos_y) > 10 || this.SpielerMitBall === 15) {
                    this.tore_m0 += 1;
                    strSpielstand = `${this.tore_m0} : ${this.tore_m1}`;
                    this.spielstatus = 1;
                    wo = 0;
                } else {
                    wo = 3; // Blue goalkeeper saves
                }
            } else { // Ball im Aus
                if (this.ballbesitz === 1) {  // wenn blau dran war
                    if (this.ball_y > TOR_O) {
                        wo = 7;
                        this.ball_y = MAX_Y;
                        this.spielstatus = 2;
                    } else {
                        wo = 8;
                        this.ball_y = 0;
                        this.spielstatus = 2;
                    }
                } else { // wenn rot dran war Abstos
                    if (this.ball_y > TOR_O) {
                        wo = 7;
                        this.spielstatus = 7;
                    } else {
                        wo = 8;
                        this.spielstatus = 7;
                    }
                }
            }
        }

        // Left side out or goal
        if (this.ball_x < 0) {
            this.switch_ballbesitz();
            if (this.schusswinkel % 90 === 0) {
                this.schusswinkel += 1;
            }
            l_y = Math.round((0 - this.ballflug_x[this.ballflug_akt - 1]) *
                Math.tan(this.schusswinkel * Math.PI / 180));
            this.ball_x = 0;
            this.ball_y = this.ballflug_y[this.ballflug_akt - 1] - l_y;

            if (this.ball_y > TOR_O && this.ball_y < TOR_U) {
                if (Math.abs(this.ball_y - this.MySpieler[14].pos_y) > 10 || this.SpielerMitBall === 14) {
                    this.tore_m1 += 1;
                    strSpielstand = `${this.tore_m0} : ${this.tore_m1}`;
                    this.spielstatus = 1;
                    wo = 1;
                } else {
                    wo = 4; // Red goalkeeper saves
                }
            } else {
                if (this.ballbesitz === 0) {
                    if (this.ball_y > TOR_O) {
                        wo = 5;
                        this.ball_y = MAX_Y;
                        this.spielstatus = 2;
                    } else {
                        wo = 6;
                        this.ball_y = 0;
                        this.spielstatus = 2;
                    }
                } else {
                    if (this.ball_y > TOR_O) {
                        wo = 5;
                        this.spielstatus = 7;
                    } else {
                        wo = 6;
                        this.spielstatus = 7;
                    }
                }
            }
        }

        // Top and bottom out
        if (this.ball_y > MAX_Y) {
            this.switch_ballbesitz();
            if (this.schusswinkel % 90 === 0) {
                this.schusswinkel += 1;
            }
            l_x = Math.round((MAX_Y - this.ballflug_y[this.ballflug_akt - 1]) *
                Math.tan((this.schusswinkel - 270) * Math.PI / 180));
            this.ball_y = MAX_Y;
            this.ball_x = this.ballflug_x[this.ballflug_akt - 1] + l_x;
            wo = 2;
        }

        if (this.ball_y < 0) {
            this.switch_ballbesitz();
            if (this.schusswinkel % 90 === 0) {
                this.schusswinkel += 1;
            }
            l_x = Math.round(this.ballflug_y[this.ballflug_akt - 1] *
                Math.tan((this.schusswinkel + 90) * Math.PI / 180));
            this.ball_y = 0;
            this.ball_x = this.ballflug_x[this.ballflug_akt - 1] - l_x;
            wo = 2;
        }
        // console.log("spielstatus: " + this.spielstatus);
        return wo;
    }

    // KI Calculate shot towards goal
    Torschuss_errechnen() {
        let diff_y = this.ball_y - 250; // Goal center
        let diff_x = this.ball_x;

        if (diff_x === 0) {
            diff_x = 1;
        }

        Ziel_Winkel = Math.round(Math.atan(diff_y / diff_x) * 180 / Math.PI);
        Ziel_Winkel = 180 - Ziel_Winkel;
        this.Ziel_Entfernung = Math.round(Math.sqrt(Math.pow(this.ball_x, 2) + Math.pow(diff_y, 2))) + 4;
    }

    // KI Ecke
    Ecke_errechnen() {
        if (this.ball_y === 0) {
            Ziel_Winkel = 280;
        } else {
            Ziel_Winkel = 80;
        }
        this.Ziel_Entfernung = 250;
    }

    // KI berechne nähesten Spieler zum roten Tor
    Pass_erechnen() {
        let best_Spieler_x = 3000; // beste X Entfernung maximal "schlecht" vorbelegen
        let nimm_diesen = -1;
        let best_entf = 0;

        // Find nearest player
        for (let i = 0; i < ANZ_SPIELER; i++) {
            if (this.MySpieler[i].Mannschaft === 1 && i !== this.SpielerMitBall) { // Only own blue team
                let entf = Math.sqrt(
                    Math.pow((this.ball_x - this.MySpieler[i].pos_x), 2) +
                    Math.pow((this.ball_y - this.MySpieler[i].pos_y), 2)
                );

                if (entf < SCHUSSMAX * 2 + 10) { // Within shooting distance
                    // Take the one closest to opponent's goal
                    if (this.MySpieler[i].pos_x < best_Spieler_x) {
                        best_Spieler_x = this.MySpieler[i].pos_x;
                        best_entf = Math.floor(entf);
                        nimm_diesen = i;
                    }
                }
            }
        }

        if (nimm_diesen !== -1) { // If a player is in good position, calculate angle
            this.Ziel_Entfernung = best_entf;
            let diff_y = this.ball_y - this.MySpieler[nimm_diesen].pos_y;
            let diff_x = this.ball_x - this.MySpieler[nimm_diesen].pos_x;

            if (diff_x === 0) { // Prevent division by zero
                Ziel_Winkel = diff_y > 0 ? 90 : 270;
            } else {
                Ziel_Winkel = Math.round(Math.atan(diff_y / diff_x) * 180 / Math.PI);
                if (this.ball_x > this.MySpieler[nimm_diesen].pos_x) {
                    Ziel_Winkel = 180 - Ziel_Winkel;
                } else {
                    if (Ziel_Winkel > 0) {
                        Ziel_Winkel = 360 - Ziel_Winkel;
                    } else {
                        Ziel_Winkel = -Ziel_Winkel;
                    }
                }
            }
        }
    }

    // KI
    Pass_ausfuehren() {
        this.MySpieler[this.SpielerMitBall].winkel = Math.floor(Ziel_Winkel);

        // abstos doppelt so schnell
        if (this.spielstatus === 7) {
            if (this.Ziel_Entfernung - this.schussstaerke * 4 < 0) { // aufziehen, bis schuss
                this.schuss();
            } else {
                this.Aktion_SPACE(); // this.Ziel_Entfernung is reset in schuss()
            }
        } else { // Normal, no goal kick
            if (this.Ziel_Entfernung - this.schussstaerke * 2 < 0) {
                this.schuss();
            } else {
                this.Aktion_SPACE(); // this.Ziel_Entfernung is reset in schuss()
            }
        }
    }

    // Returns number of nearest player (ONLY happens through this function, or during Init!)
    // Berücksichtigt mannschaft_kriegt_ball (-1 = nicht relevant, 0, 1)
    // Setzt ihre Zielkoordinaten auf den Ball
    // Neue Puste für Spieler, wenn sie vorher keinen Ball hatten
    // Setzt Sperre nach 2. Mal gleicher Spieler
    NaehesterSpieler() {
        let bester = 0;
        let Abstand = 600000; // > als 750*750 + 500*500
        for (let i = 0; i < ANZ_SPIELER; i++) {
            if (this.MySpieler[i].Mannschaft === this.mannschaft_kriegt_ball || this.mannschaft_kriegt_ball === -1) {
                if (!this.MySpieler[i].sperre) { // Will be unlocked this time anyway
                    // a^2 = b^2 + c^2  Taking square root only costs time
                    let entf = Math.pow((this.ball_x - this.MySpieler[i].pos_x), 2) +
                        Math.pow((this.ball_y - this.MySpieler[i].pos_y), 2);

                    if (entf < Abstand) {
                        // For goal kick, only goalkeeper can go
                        if (this.spielstatus !== 7 || this.MySpieler[i].Typ === 'T') {
                            Abstand = entf;
                            bester = i;
                        }
                    }
                } else {
                    // console.log('Spieler gesperrt');
                    this.MySpieler[i].sperre = false; // Can participate next time
                }
            }
        }

        this.MySpieler[bester].ziel_x = this.ball_x;
        this.MySpieler[bester].ziel_y = this.ball_y;

        // Now restore stamina if not goalkeeper. Remove lock
        if (this.MySpieler[bester].Typ !== 'T') {
            if (bester !== this.SpielerMitBall) {
                this.MySpieler[bester].puste = Spieler.MAX_PUSTE;
                this.MySpieler[this.SpielerMitBall].sperre = false; // Other has ball, so remove lock

                // If other team gets the ball (For goalkeeper comes "Abstos", for corner "Ecke")
                if (this.MySpieler[bester].Mannschaft !== this.MySpieler[this.SpielerMitBall].Mannschaft &&
                    this.spielstatus !== 2) {
                    if (this.MySpieler[bester].Mannschaft === 0) {
                        this.playSound('a_rot');
                    } else {
                        this.playSound('a_blau');
                    }
                }
            } else { // einmal darf man sich selbst vorlegen
                this.MySpieler[bester].puste = Math.round(Spieler.MAX_PUSTE / 2); // 2nd time with ball only half energy
                this.MySpieler[bester].sperre = true; // Player can't again. Becomes player with ball
                this.playSound('a_puh'); // Already groaning ;-)
            }
        } else { // Best is goalkeeper
            this.MySpieler[this.SpielerMitBall].sperre = false; // Other has ball, so remove lock
            this.playSound('a_abstos'); // Now goal kick
        }

        this.mannschaft_kriegt_ball = -1; // Jetzt kann jede Mannschaft den Ball wieder nehmen
        return bester;
    }

    // Motion control methods assigned from motioncontrol.js
    delegateKeyCommand = motion.delegateKeyCommand;
    Aktion_LEFT = motion.Aktion_LEFT;
    Aktion_RIGHT = motion.Aktion_RIGHT;
    Aktion_UP = motion.Aktion_UP;
    Aktion_DOWN = motion.Aktion_DOWN;
    Aktion_PG_UP = motion.Aktion_PG_UP;
    Aktion_PG_DOWN = motion.Aktion_PG_DOWN;
    Aktion_SPACE = motion.Aktion_SPACE;
    pauseGame = motion.pauseGame;
    tastatursteuerung = motion.tastatursteuerung;
    keyPressed = motion.keyPressed;
    keyReleased = motion.keyReleased;
    initializeGyroAndTouch = motion.initializeGyroAndTouch;
    handleTouchStart = motion.handleTouchStart;
    handleTouchMove = motion.handleTouchMove;
    handleTouchEnd = motion.handleTouchEnd;
    handleTouchCancel = motion.handleTouchCancel;
    processTouch = motion.processTouch;
    finishTouch = motion.finishTouch;
    resetTouchState = motion.resetTouchState;


}