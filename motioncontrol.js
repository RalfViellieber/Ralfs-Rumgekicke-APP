import { MAX_X, MAX_Y, C_SPACE_X, C_SPACE_Y, KEYS, SCHUSSMIN, SCHUSSMAX } from './constants.js';

export function delegateKeyCommand(code, isDown) {
    //console.log('code: ' + code + ' isDown' + isDown)
    switch (code) {
        case 'ArrowUp':
            this.downKeys[KEYS.UP] = isDown;
            break;
        case 'ArrowDown':
            this.downKeys[KEYS.DOWN] = isDown;
            break;
        case 'ArrowLeft':
            this.downKeys[KEYS.LEFT] = isDown;
            break;
        case 'ArrowRight':
            this.downKeys[KEYS.RIGHT] = isDown;
            break;
        case 'PageUp':
        case '.':
            this.downKeys[KEYS.P_UP] = isDown;
            break;
        case 'PageDown':
        case '-':
            this.downKeys[KEYS.P_DOWN] = isDown;
            break;
        case ' ': // Space key
            this.downKeys[KEYS.SPACE] = isDown;
            break;
        case 'Escape':
            this.downKeys[KEYS.ESC] = isDown;
            break;
    }
}

export function Aktion_LEFT() {
    if (this.MySpieler[this.SpielerMitBall].puste > 0) {
        this.ball_x -= this.SCHRITT;
        if (this.ball_x < 0) {
            // debugger;
            this.playSound('aus');
            this.switch_ballbesitz();
            this.ball_x = 0 + 2;
            this.Ball_liegt_rum = true;
            let local_mannschaft_kriegt_ball = this.mannschaft_kriegt_ball;
            this.SpielerMitBall = this.NaehesterSpieler();
            this.MySpieler[this.SpielerMitBall].puste = 0;
            // debugger;
            if (local_mannschaft_kriegt_ball === 1) { // wenn blau dran - Ecke
                if (this.ball_y <= 250) { // obere Ecke
                    this.ball_y = 0 + 4;
                } else { // untere Ecke
                    this.ball_y = MAX_Y - 4;
                }
            } else { // Rot - Abstoss
                this.ball_y = 250;
            }
            this.MySpieler[this.SpielerMitBall].ziel_x = this.ball_x;
            this.MySpieler[this.SpielerMitBall].ziel_y = this.ball_y;
            this.MySpieler[this.SpielerMitBall].sperre = true;
        } else {
            this.MySpieler[this.SpielerMitBall].pos_x -= this.SCHRITT;
            this.MySpieler[this.SpielerMitBall].puste -= this.SCHRITT + 1;
        }
    }
}

export function Aktion_RIGHT() {
    //console.log('Aktion_RIGHT');
    if (this.MySpieler[this.SpielerMitBall].puste > 0) {
        this.ball_x += this.SCHRITT;
        if (this.ball_x > MAX_X) {
            this.playSound('aus');
            this.switch_ballbesitz();
            this.ball_x = MAX_X - 2;
            this.Ball_liegt_rum = true;
            let local_mannschaft_kriegt_ball = this.mannschaft_kriegt_ball;
            this.SpielerMitBall = this.NaehesterSpieler();
            this.MySpieler[this.SpielerMitBall].puste = 0;
            if (local_mannschaft_kriegt_ball === 0) {
                if (this.ball_y <= 250) {
                    this.ball_y = 0 + 4;
                } else {
                    this.ball_y = MAX_Y - 4;
                }
            } else {
                this.ball_y = 250;
            }
            this.MySpieler[this.SpielerMitBall].ziel_x = this.ball_x;
            this.MySpieler[this.SpielerMitBall].ziel_y = this.ball_y;
            this.MySpieler[this.SpielerMitBall].sperre = true;
        } else {
            this.MySpieler[this.SpielerMitBall].pos_x += this.SCHRITT;
            this.MySpieler[this.SpielerMitBall].puste -= this.SCHRITT + 1;
        }
    }
}

export function Aktion_UP() {
    if (this.MySpieler[this.SpielerMitBall].puste > 0) {
        this.ball_y -= this.SCHRITT;
        if (this.ball_y < 0) {
            this.playSound('aus');
            this.switch_ballbesitz();
            this.ball_y = 0;
            this.Ball_liegt_rum = true;
            this.SpielerMitBall = this.NaehesterSpieler();
            this.MySpieler[this.SpielerMitBall].puste = 0;
            this.MySpieler[this.SpielerMitBall].sperre = true;
        } else {
            this.MySpieler[this.SpielerMitBall].pos_y -= this.SCHRITT;
            this.MySpieler[this.SpielerMitBall].puste -= this.SCHRITT;
        }
    }
}

export function Aktion_DOWN() {
    if (this.MySpieler[this.SpielerMitBall].puste > 0) {
        this.ball_y += this.SCHRITT;
        if (this.ball_y > MAX_Y) {
            this.playSound('aus');
            this.switch_ballbesitz();
            this.ball_y = MAX_Y;
            this.Ball_liegt_rum = true;
            this.SpielerMitBall = this.NaehesterSpieler();
            this.MySpieler[this.SpielerMitBall].puste = 0;
            this.MySpieler[this.SpielerMitBall].sperre = true;
        } else {
            this.MySpieler[this.SpielerMitBall].pos_y += this.SCHRITT;
            this.MySpieler[this.SpielerMitBall].puste -= this.SCHRITT;
        }
    }
}

export function Aktion_PG_UP() {
    this.MySpieler[this.SpielerMitBall].winkel += 5;
    if (this.MySpieler[this.SpielerMitBall].winkel >= 360) {
        this.MySpieler[this.SpielerMitBall].winkel = 0;
    }
}

export function Aktion_PG_DOWN() {
    this.MySpieler[this.SpielerMitBall].winkel -= 5;
    if (this.MySpieler[this.SpielerMitBall].winkel <= 0) {
        this.MySpieler[this.SpielerMitBall].winkel = 359;
    }
}

export function Aktion_SPACE() {
    if (this.SchussPause === 0) {
        if (this.schussstaerke === SCHUSSMIN) {
            this.playSound('a_abzug');
        }
        if (this.schussstaerke < SCHUSSMAX) {
            this.schussstaerke += 2;
        } else {
            this.schuss();
        }
    }
}

export function pauseGame() {
    if (this.Spiel_laeuft) {
        this.Spiel_laeuft = false;
        if (typeof Howler !== 'undefined') {
            Howler.mute(true);
        }
    }
}

export function tastatursteuerung() {
    if (this.downKeys[KEYS.ESC]) this.pauseGame();
    if (!this.Ball_liegt_rum) {
        if (!this.bEinzelspieler || this.ballbesitz === 0) {
            if (this.downKeys[KEYS.DOWN]) this.Aktion_DOWN();
            if (this.downKeys[KEYS.UP]) this.Aktion_UP();
            if (this.downKeys[KEYS.LEFT]) this.Aktion_LEFT();
            if (this.downKeys[KEYS.RIGHT]) this.Aktion_RIGHT();
            if (this.downKeys[KEYS.P_UP]) this.Aktion_PG_UP();
            if (this.downKeys[KEYS.P_DOWN]) this.Aktion_PG_DOWN();
            if (this.downKeys[KEYS.SPACE]) this.Aktion_SPACE();
        }
    }
}

export function keyPressed(event) {
    if ((!this.Spiel_laeuft)) {
        if (this.SchussPause === 0) {
            if (this.spielstatus !== 4 && this.spielstatus !== 5 && this.spielstatus !== 6) {
                if (this.spielstatus !== 0) {
                    this.spielstatus = 0;
                } else {
                    this.Spiel_laeuft = true;
                    if (typeof Howler !== 'undefined') {
                        Howler.mute(false);
                    }
                    this.playSound('a_pfiff');
                }
            } else {
                this.Neustart();
            }
        }
    } else {
        this.delegateKeyCommand(event.key, true);
    }
}

export function keyReleased(event) {
    this.delegateKeyCommand(event.key, false);

    const shouldHandleShot = (
        ((this.bEinzelspieler && this.ballbesitz === 0) || !this.bEinzelspieler) &&
        !this.Ball_liegt_rum &&
        this.Spiel_laeuft
    );

    if (shouldHandleShot && event.key === ' ' && this.SchussPause === 0) {
        this.schuss();
    }
}

export function initializeGyroAndTouch() {
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.addEventListener('touchcancel', this.handleTouchCancel.bind(this));
}

export function handleTouchStart(event) {
    event.preventDefault();

    // Limit auf maximal 3 Touches
    if (event.touches.length > 3) {
        return;
    }

    // Double Tap Detection für Pause (ESC)
    if (event.touches.length === 1) {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - this.lastTapTime;
        if (tapLength < 300 && tapLength > 0) {
            this.downKeys[KEYS.ESC] = true;
            setTimeout(() => {
                this.downKeys[KEYS.ESC] = false;
            }, 200);
            return;
        }
        this.lastTapTime = currentTime;
    }

    if (!this.Spiel_laeuft) {
        if (this.SchussPause === 0) {
            if (this.spielstatus !== 4 && this.spielstatus !== 5 && this.spielstatus !== 6) {
                if (this.spielstatus !== 0) {
                    this.spielstatus = 0;
                } else {
                    this.Spiel_laeuft = true;
                    if (typeof Howler !== 'undefined') {
                        Howler.mute(false);
                    }
                    this.playSound('a_pfiff');
                }
            } else {
                this.Neustart();
            }
        }
    } else {
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            this.processTouch(touch);
        }
    }
}

export function handleTouchMove(event) {
    event.preventDefault();
    if (this.Spiel_laeuft) {
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            this.processTouch(touch);
        }
    }
}

export function handleTouchEnd(event) {
    event.preventDefault();
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        this.finishTouch(touch);
    }
}

export function handleTouchCancel(event) {
    event.preventDefault();
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        this.finishTouch(touch);
    }
}

export function finishTouch(touch) {
    const id = touch.identifier;

    // Prüfen ob dieser Touch ein Schuss-Touch war, BEVOR wir die Mappings löschen
    const shootData = this.touchShootingData[id];
    const wasShootingTouch = this.touchKeyMapping[id] && this.touchKeyMapping[id].includes(KEYS.SPACE);

    // Tasten für diesen Touch loslassen
    if (this.touchKeyMapping[id]) {
        this.touchKeyMapping[id].forEach(key => {
            // Nur loslassen, wenn kein anderer Touch diese Taste hält
            let keyStillPressed = false;
            for (let otherId in this.touchKeyMapping) {
                if (otherId != id && this.touchKeyMapping[otherId].includes(key)) {
                    keyStillPressed = true;
                    break;
                }
            }
            if (!keyStillPressed) {
                this.downKeys[key] = false;
            }
        });
        delete this.touchKeyMapping[id];
    }

    // Schuss verarbeiten
    if (shootData) {
        clearTimeout(shootData.timeout);

        // Wenn es ein Schuss-Touch war, Schuss auslösen (nur wenn Schusspause vorbei und Ball nicht im Flug)
        if (wasShootingTouch && this.SchussPause === 0 && !this.Ball_liegt_rum) {
            if (Date.now() - shootData.startTime >= this.TOUCH_THRESHOLD) {
                this.schuss();
            }
        }
        delete this.touchShootingData[id];
    }
}

export function resetTouchState() {
    // Alle Timeouts stoppen
    for (let id in this.touchShootingData) {
        clearTimeout(this.touchShootingData[id].timeout);
    }

    // Alle Tasten loslassen die durch Touches gesetzt wurden
    for (let id in this.touchKeyMapping) {
        this.touchKeyMapping[id].forEach(key => {
            this.downKeys[key] = false;
        });
    }

    // Mappings leeren
    this.touchKeyMapping = {};
    this.touchShootingData = {};
}

// Interne Hilfsmethode (wird an SoccerGame gebunden oder direkt aufgerufen)
export function processTouch(touch) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const touchX = (touch.clientX - rect.left) * scaleX;
    const touchY = (touch.clientY - rect.top) * scaleY;
    const id = touch.identifier;

    let newKeys = [];
    let isTouchInGoalArea = false;
    let isArrowTouch = false;

    if (touchX <= C_SPACE_X / 2) {
        if (this.ballbesitz === 0) {
            isTouchInGoalArea = true;
        } else {
            if (touchY < MAX_Y / 2 + C_SPACE_Y / 2) {
                isArrowTouch = true;
                newKeys.push(KEYS.P_DOWN);
            } else {
                isArrowTouch = true;
                newKeys.push(KEYS.P_UP);
            }
        }
    } else if (touchX >= MAX_X + C_SPACE_X / 2) {
        if (this.ballbesitz === 1) {
            isTouchInGoalArea = true;
        } else {
            if (touchY < MAX_Y / 2 + C_SPACE_Y / 2) {
                isArrowTouch = true;
                newKeys.push(KEYS.P_UP);
            } else {
                isArrowTouch = true;
                newKeys.push(KEYS.P_DOWN);
            }
        }
    }

    if (isTouchInGoalArea) {
        if (!this.touchShootingData[id] && this.SchussPause === 0 && !this.Ball_liegt_rum) {
            this.touchShootingData[id] = {
                startTime: Date.now(),
                timeout: setTimeout(() => {
                    this.downKeys[KEYS.SPACE] = true;
                }, this.TOUCH_THRESHOLD)
            };
        }
        if (this.touchShootingData[id]) {
            newKeys.push(KEYS.SPACE);
        }
    } else if (!isArrowTouch) {
        const playerX = this.MySpieler[this.SpielerMitBall].pos_x + C_SPACE_X / 2;
        const playerY = this.MySpieler[this.SpielerMitBall].pos_y + C_SPACE_Y / 2;
        const deltaX = touchX - playerX;
        const deltaY = touchY - playerY;

        if (deltaX > 50) newKeys.push(KEYS.RIGHT);
        else if (deltaX < -50) newKeys.push(KEYS.LEFT);

        if (deltaY > 40) newKeys.push(KEYS.DOWN);
        else if (deltaY < -40) newKeys.push(KEYS.UP);
    }

    // Vorherige Tasten für diesen Touch zurücksetzen (falls sie sich geändert haben)
    if (this.touchKeyMapping[id]) {
        this.touchKeyMapping[id].forEach(key => {
            if (!newKeys.includes(key)) {
                // Taste loslassen, falls kein anderer Touch sie hält
                let stillTriggered = false;
                for (let otherId in this.touchKeyMapping) {
                    if (otherId != id && this.touchKeyMapping[otherId].includes(key)) {
                        stillTriggered = true;
                        break;
                    }
                }
                if (!stillTriggered) this.downKeys[key] = false;
            }
        });
    }

    // Neue Tasten setzen
    this.touchKeyMapping[id] = newKeys;
    newKeys.forEach(key => {
        this.downKeys[key] = true;
    });
}
