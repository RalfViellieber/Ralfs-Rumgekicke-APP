// gameOptions.js
export let gameOptions = {
    einzelspieler: true,
    level: 0,
    spielgeschwindigkeit: 40,
    wechselpause: 0,
    useKeyboard: false,
    isMobile: false,
    actionBoost: false,
    isInitialized: false
};

export function updateGameOptions(options) {
    gameOptions.einzelspieler = options.einzelspieler;
    gameOptions.level = options.level;
    gameOptions.spielgeschwindigkeit = options.spielgeschwindigkeit;
    gameOptions.wechselpause = options.wechselpause;
    gameOptions.useKeyboard = options.useKeyboard;
    gameOptions.isMobile = options.isMobile;
    gameOptions.actionBoost = options.actionBoost;
    gameOptions.isInitialized = true;
    console.log("updateGameOptions");
}