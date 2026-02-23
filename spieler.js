let MAX_X = 750;
let MAX_Y = 500;
export let C_BALL_ZEIT = 8;
const C_BALL_ZEIT_BASE = 8;

export class Spieler {
  static STEP = 1;
  static ORT_O = 140; // obere Position
  static ORT_M = 250; // mittlere Position
  static ORT_U = 360; // untere Position
  static TYP_D = 180; // Verteidiger
  static TYP_D2 = 570; // Verteidiger
  static TYP_M = 375; // Mittelfeld
  static TYP_A = 550; // Angreifer
  static TYP_A2 = 200; // Angreifer
  static MAX_PUSTE = 100; // Energie zum Laufen
  static MAX_PUSTE_BASE = 100;
  static SCHRITT_MAX_X_1 = 90;
  static SCHRITT_MAX_X_2 = 120;
  static SCHRITT_MAX_Y_1 = 60;
  static SCHRITT_MAX_Y_2 = 80;
  static SCHRITT_ZUM_BALL = 10;
  static MAX_ABW_X = 110;
  static MAX_ABW_Y = 90;



  static r1 = Math.random;

  constructor(spielInstanz) {
    this.spiel = spielInstanz;
    this.Mannschaft = 0;
    this.nr = 0;
    this.pos_x = 0;
    this.pos_y = 0;
    this.Typ = 'D';
    this.Ort = 'M';
    this.ziel_x = -1;
    this.ziel_y = -1;
    this.winkel = 0;
    this.puste = 0;
    this.sperre = false;
  }

  SetSpieler(MyMannschaft, Mynr, Mypos_x, Mypos_y, MyTyp, MyOrt, MyWinkel) {
    this.Mannschaft = MyMannschaft;
    this.nr = Mynr;
    this.pos_x = Mypos_x;
    this.pos_y = Mypos_y;
    this.Typ = MyTyp;
    this.Ort = MyOrt;
    this.ziel_x = -1;
    this.ziel_y = -1;
    this.winkel = MyWinkel;
    this.sperre = false;
    if (this.Typ !== 'T') {
      this.puste = Spieler.MAX_PUSTE;
    } else {
      this.puste = 0;
    }
  }

  gib_ball() {
    this.spiel.Ball_liegt_rum = false;
    this.spiel.Am_Ball_Zeit = C_BALL_ZEIT;
  }

  setze_ziel(m_ziel_x, m_ziel_y) {
    this.ziel_x = m_ziel_x;
    this.ziel_y = m_ziel_y;
  }

  bewege_auto() {
    if (this.nr === this.spiel.SpielerMitBall && !this.spiel.Ball_liegt_rum) {
      // console.log('this.nr ' + this.nr + ' ball liegt nicht rum');
      return;
    }

    if (this.ziel_x === -1) {
      this.NeuesZiel(this.spiel.ballbesitz);
      return;
    }

    if (this.ziel_x !== -1) {
      if (this.pos_x < this.ziel_x) {
        this.pos_x += Spieler.STEP;
      } else {
        this.pos_x -= Spieler.STEP;
      }

      if (this.pos_y < this.ziel_y) {
        this.pos_y += Spieler.STEP;
      } else {
        this.pos_y -= Spieler.STEP;
      }

      // Kollision, wenn ...
      if (Math.abs(this.spiel.ball_x - this.pos_x) < 13 &&
        Math.abs(this.spiel.ball_y - this.pos_y) < 13 &&
        this.spiel.SpielerMitBall !== this.nr &&
        this.Typ !== 'T' &&
        this.spiel.b_kollision === false &&
        this.Mannschaft !== this.spiel.ballbesitz &&
        (this.spiel.ballflug_x[this.spiel.ballflug_akt] !== -1 || !this.spiel.Ball_liegt_rum)) {
        this.spiel.b_kollision = true;
        /* alert(`Kollision!
         Ball: (${Math.round(this.spiel.ball_x)}/${Math.round(this.spiel.ball_y)})
         Spieler ${this.nr} (${this.Mannschaft}): (${Math.round(this.pos_x)}/${Math.round(this.pos_y)})
         Ballbesitz: ${this.spiel.ballbesitz}
         SpielerMitBall: ${this.spiel.SpielerMitBall}
         Ball fliegt: ${this.spiel.ballflug_x[this.spiel.ballflug_akt] !== -1}
         Ball liegt rum: ${this.spiel.Ball_liegt_rum}`);
         */
      }

      // am Schluss genau auf Ziel setzen
      if (Math.abs(this.pos_x - this.ziel_x) < Spieler.STEP + 1 &&
        Math.abs(this.pos_y - this.ziel_y) < Spieler.STEP + 1) {
        this.pos_x = this.ziel_x;
        this.pos_y = this.ziel_y;

        if (this.pos_x === this.spiel.ball_x &&
          this.pos_y === this.spiel.ball_y &&
          this.spiel.SpielerMitBall === this.nr) { // dieser Spieler kriegt den Ball
          console.log('Spieler ' + this.spiel.SpielerMitBall + ' kriegt Ball');
          this.spiel.Ball_liegt_rum = false;
          // this.spiel.ballbesitz = this.Mannschaft;
          this.spiel.getBallbesitz(this.Mannschaft);
          console.log('Ballbesitz ' + this.spiel.ballbesitz + ' Spieler ' + this.spiel.SpielerMitBall);
          if (this.Typ === 'T') {
            this.spiel.Am_Ball_Zeit = 6;
          } else {
            this.spiel.Am_Ball_Zeit = C_BALL_ZEIT;
          }
        }

        this.ziel_x = -1;
        this.ziel_y = -1;

        if (this.Typ === 'T' && this.spiel.SpielerMitBall === this.nr) { // wenn Torhüter denn Ball hat
          this.pos_y = 250;
          this.spiel.ball_y = 250;
          if (this.Mannschaft === 0) {
            this.pos_x = 0;
          } else {
            this.pos_x = MAX_X;
          }
          this.spiel.ball_x = this.pos_x;
          this.sperre = true; // darf sich nicht selbst vorlegen
        } else {
          if (this.spiel.spielstatus === 2) { // Ecke
            if (this.pos_y === 0) {
              if (this.pos_x === 0) {
                this.winkel = 315;
              } else {
                this.winkel = 225;
              }
            }
            if (this.pos_y === MAX_Y) {
              if (this.pos_x === 0) {
                this.winkel = 45;
              } else {
                this.winkel = 135;
              }
            }
          } else {
            if (this.pos_y === 0) {
              this.winkel = 270;
            }
            if (this.pos_y === MAX_Y) {
              this.winkel = 90;
            }
          }
        }
      }
    }
  }

  // je nachdem welche Mannschaft den Ball hat ein neues Ziel für diesen Spieler (je Typ) bestimmen
  NeuesZiel(ballbesitz) {
    // Symmetrischer Bereich, zu 50% negativ
    let r_x = Math.floor(Math.random() * 2000) - 1000;
    let r_y = Math.floor(Math.random() * 2000) - 1000;
    let ballbonus = 0;

    if (this.Typ === 'T') { // Torhüter bewegen sich auf der Grundlinie hin und her
      if (this.Mannschaft === 0) {
        this.ziel_x = 0;
      } else {
        this.ziel_x = MAX_X;
      }
      if (this.pos_y === 250) {
        if (this.spiel.ball_y > 250) {
          this.ziel_y = 268;
        } else {
          this.ziel_y = 232;
        }
      } else {
        this.ziel_y = 250;
      }
      return;
    }

    if (ballbesitz === this.Mannschaft) { // wenn man Ball hat, nach vorne, sonst zurück
      ballbonus = 100;
    } else {
      ballbonus = -100;
    }

    switch (this.Typ) {
      case 'D':
        if (this.Mannschaft === 0) { // rot
          if (this.pos_x >= Spieler.TYP_D + ballbonus + Spieler.MAX_ABW_X) {
            this.ziel_x = this.pos_x - Math.abs(r_x) % Spieler.SCHRITT_MAX_X_1;
          } else if (this.pos_x < Spieler.TYP_D + ballbonus - Spieler.MAX_ABW_X) {
            this.ziel_x = this.pos_x + Math.abs(r_x) % Spieler.SCHRITT_MAX_X_1;
          } else {
            this.ziel_x = this.pos_x + r_x % Spieler.SCHRITT_MAX_X_2;
          }
        } else { // blau
          if (this.pos_x <= Spieler.TYP_D2 - ballbonus - Spieler.MAX_ABW_X) {
            this.ziel_x = this.pos_x + Math.abs(r_x) % Spieler.SCHRITT_MAX_X_1;
          } else if (this.pos_x >= Spieler.TYP_D2 - ballbonus + Spieler.MAX_ABW_X) {
            this.ziel_x = this.pos_x - Math.abs(r_x) % Spieler.SCHRITT_MAX_X_1;
          } else {
            this.ziel_x = this.pos_x - r_x % Spieler.SCHRITT_MAX_X_2;
          }
        }
        break;
      case 'M':
        if (this.Mannschaft === 0) {
          if (this.pos_x >= Spieler.TYP_M + ballbonus + Spieler.MAX_ABW_X) {
            this.ziel_x = this.pos_x - Math.abs(r_x) % Spieler.SCHRITT_MAX_X_1;
          } else if (this.pos_x <= Spieler.TYP_M + ballbonus - Spieler.MAX_ABW_X) {
            this.ziel_x = this.pos_x + Math.abs(r_x) % Spieler.SCHRITT_MAX_X_1;
          } else {
            this.ziel_x = this.pos_x + r_x % Spieler.SCHRITT_MAX_X_2;
          }
        } else {
          if (this.pos_x >= Spieler.TYP_M - ballbonus + Spieler.MAX_ABW_X) {
            this.ziel_x = this.pos_x - Math.abs(r_x) % Spieler.SCHRITT_MAX_X_1;
          } else if (this.pos_x <= Spieler.TYP_M - ballbonus - Spieler.MAX_ABW_X) {
            this.ziel_x = this.pos_x + Math.abs(r_x) % Spieler.SCHRITT_MAX_X_1;
          } else {
            this.ziel_x = this.pos_x + r_x % Spieler.SCHRITT_MAX_X_2;
          }
        }
        break;
      case 'A':
        if (this.Mannschaft === 0) {
          if (this.pos_x >= Spieler.TYP_A + ballbonus + Spieler.MAX_ABW_X) {
            this.ziel_x = this.pos_x - Math.abs(r_x) % Spieler.SCHRITT_MAX_X_1;
          } else if (this.pos_x <= Spieler.TYP_A + ballbonus - Spieler.MAX_ABW_X) {
            this.ziel_x = this.pos_x + Math.abs(r_x) % Spieler.SCHRITT_MAX_X_1;
          } else {
            this.ziel_x = this.pos_x + r_x % Spieler.SCHRITT_MAX_X_2;
          }
        } else {
          if (this.pos_x >= Spieler.TYP_A2 - ballbonus + Spieler.MAX_ABW_X) {
            this.ziel_x = this.pos_x - Math.abs(r_x) % Spieler.SCHRITT_MAX_X_1;
          } else if (this.pos_x <= Spieler.TYP_A2 - ballbonus - Spieler.MAX_ABW_X) {
            this.ziel_x = this.pos_x + Math.abs(r_x) % Spieler.SCHRITT_MAX_X_1;
          } else {
            this.ziel_x = this.pos_x + r_x % Spieler.SCHRITT_MAX_X_2;
          }
        }
        break;
      default:
        console.log("Falscher Spielertyp");
    }

    // static ORT_O = 140;
    // static ORT_M = 250;
    // static ORT_U = 360;
    // static MAX_ABW_X = 110;
    // static MAX_ABW_Y = 90;
    // static SCHRITT_MAX_X_1 = 90;
    // static SCHRITT_MAX_X_2 = 120;
    // static SCHRITT_MAX_Y_1 = 60;
    // static SCHRITT_MAX_Y_2 = 80;
    switch (this.Ort) { // Calculate Y-axis movement
      case 'o':
        if (Math.abs(this.pos_y - Spieler.ORT_O) > Spieler.MAX_ABW_Y) { // Spieler soll +/- MAX_ABW_Y in seinen Grenzen bleiben
          if (this.pos_y >= Spieler.ORT_O) {
            this.ziel_y = this.pos_y - Math.abs(r_y) % Spieler.SCHRITT_MAX_Y_1;
          } else {
            this.ziel_y = this.pos_y + Math.abs(r_y) % Spieler.SCHRITT_MAX_Y_1;
          }
        } else {
          this.ziel_y = this.pos_y + r_y % Spieler.SCHRITT_MAX_Y_2;
        }
        break;
      case 'm':
        if (Math.abs(this.pos_y - Spieler.ORT_M) > Spieler.MAX_ABW_Y) { // außerhalb seiner Grenzen
          if (this.pos_y >= Spieler.ORT_M) {
            this.ziel_y = this.pos_y - Math.abs(r_y) % Spieler.SCHRITT_MAX_Y_1;
          } else {
            this.ziel_y = this.pos_y + Math.abs(r_y) % Spieler.SCHRITT_MAX_Y_1;
          }
        } else {
          this.ziel_y = this.pos_y + r_y % Spieler.SCHRITT_MAX_Y_2;
        }
        break;
      case 'u':
        if (Math.abs(this.pos_y - Spieler.ORT_U) > Spieler.MAX_ABW_Y) { // too far
          if (this.pos_y >= Spieler.ORT_U) {
            this.ziel_y = this.pos_y - Math.abs(r_y) % Spieler.SCHRITT_MAX_Y_1;
          } else {
            this.ziel_y = this.pos_y + Math.abs(r_y) % Spieler.SCHRITT_MAX_Y_1;
          }
        } else {
          this.ziel_y = this.pos_y + r_y % Spieler.SCHRITT_MAX_Y_2;
        }
        break;
      default:
        console.log("Invalid player position");
    }

    // Players should move towards the ball (ToDo: only when near the ball?)
    if (this.Typ === 'D') {
      if (this.spiel.ball_y < this.ziel_y) {
        this.ziel_y = this.ziel_y - Spieler.SCHRITT_ZUM_BALL - 2;
      } else {
        this.ziel_y = this.ziel_y + Spieler.SCHRITT_ZUM_BALL + 2;
      }
      if (this.spiel.ball_x < this.ziel_x) {
        this.ziel_x = this.ziel_x - Spieler.SCHRITT_ZUM_BALL - 2;
      } else {
        this.ziel_x = this.ziel_x + Spieler.SCHRITT_ZUM_BALL + 2;
      }
    } else {
      if (this.spiel.ball_y < this.ziel_y) {
        this.ziel_y = this.ziel_y - Spieler.SCHRITT_ZUM_BALL;
      } else {
        this.ziel_y = this.ziel_y + Spieler.SCHRITT_ZUM_BALL;
      }
      if (this.spiel.ball_x < this.ziel_x) {
        this.ziel_x = this.ziel_x - Spieler.SCHRITT_ZUM_BALL;
      } else {
        this.ziel_x = this.ziel_x + Spieler.SCHRITT_ZUM_BALL;
      }
    }

    // Everyone runs to the corner
    if (this.spiel.spielstatus === 2) { // Corner
      if (this.spiel.ball_x < this.ziel_x) {
        this.ziel_x = this.ziel_x - Spieler.SCHRITT_MAX_Y_1;
      } else {
        this.ziel_x = this.ziel_x + Spieler.SCHRITT_MAX_Y_1;
      }
    }

    // Prevent running out of bounds
    if (this.ziel_x < 0) {
      this.ziel_x = Math.abs(this.ziel_x);
    }
    if (this.ziel_x > MAX_X) {  // z.b. 760
      this.ziel_x = 2 * MAX_X - this.ziel_x; // 2*750 - 760 = 740
    }
    if (this.ziel_y < 0) {
      this.ziel_y = Math.abs(this.ziel_y);
    }
    if (this.ziel_y > MAX_Y) {
      this.ziel_y = 2 * MAX_Y - this.ziel_y;
    }
    // Für Test, ob Zufallsgenerator korrekt tut
    // global_x = global_x + this.ziel_x;
    // global_x_anz = global_x_anz + 1;
    // console.log("X " + global_x/global_x_anz);
    // global_y = global_y + this.ziel_y;
    // global_y_anz = global_y_anz + 1;
    // console.log("Y " + global_y/global_y_anz);
  }
}

// easy mode (Action-Boost) for touch devices
export const C_MOBIL_ZEIT_ADD = 4;
export const C_MAX_PUSTE_ADD = 50;

export function setMobilParameters(useBoost) {
  if (useBoost) {
    C_BALL_ZEIT = C_BALL_ZEIT_BASE + C_MOBIL_ZEIT_ADD;
    Spieler.MAX_PUSTE = Spieler.MAX_PUSTE_BASE + C_MAX_PUSTE_ADD;
  } else {
    C_BALL_ZEIT = C_BALL_ZEIT_BASE;
    Spieler.MAX_PUSTE = Spieler.MAX_PUSTE_BASE;
  }
}