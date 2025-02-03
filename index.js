/// <reference types="../CTAutocomplete" />

import { registerWhen } from "../BloomCore/utils/Utils";
import WebSocket from "../WebSocket";
import PogObject from "../PogData";

const data = new PogObject("twitchchat", {
  "channel": "",
  "oauth": "",
  "nick": "",
  "x": 20,
  "y": 20,
  "toggled": false,
  "stayConnected": false,
  "scale": 1,
  "msgCap": 8
}, "data.json");

const moveGUI = new Gui();

const colorCodes = [
  "§3", // Dark Aqua
  "§4", // Dark Red
  "§5", // Dark Purple
  "§6", // Gold
  "§7", // Gray
  "§9", // Blue
  "§a", // Green
  "§b", // Aqua
  "§c", // Red
  "§d", // Light Purple
  "§e", // Yellow
];

register("command", (...args) => {
  if (!args?.[0]) {
    commandHelp();
    return;
  }

  switch (args[0]) {
    case "toggle":
      data.toggled = !data.toggled;
      ChatLib.chat(data.toggled);
      data.save();
      break;
    case "connect":
    case "open":
      data.stayConnected = true;
      data.save();
      ws.connect();
      break;
    case "close":
      data.stayConnected = false;
      data.save();
      ws.close();
      break;
    case "channel":
      data.channel = args[1];
      data.save();
      break;
    case "oauth":
      data.oauth = args[1];
      data.save();
      break;
    case "nick":
      data.nick = args[1];
      data.save();
      break;
    case "move":
      moveGUI.open();
      break;
    case "msgcap":
      data.msgCap = args[1];
      data.save();
      break;
    case "clear":
      recentMessages = [];
      break;
    default:
      commandHelp();
      break;
  }
}).setName("ttv");

const commandHelp = () => {
  ChatLib.chat("/ttv toggle");
  ChatLib.chat("/ttv connect");
  ChatLib.chat("/ttv close");
  ChatLib.chat("/ttv oauth");
  ChatLib.chat("/ttv nick");
  ChatLib.chat("/ttv move");
  ChatLib.chat("/ttv msgcap");
  ChatLib.chat("/ttv clear");
}

const ws = new WebSocket("wss://irc-ws.chat.twitch.tv:443");


ws.onOpen = () => {
  // ChatLib.chat("&7open");
  console.log("ws connection opened");

  ws.send(`PASS ${data.oauth}`);
  ws.send(`NICK ${data.nick}`);
  ws.send(`JOIN #${data.channel}`);
}



const regex = /:(\w+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG #\w+ :(.+)/;
let userColors = {};
ws.onMessage = (msg) => {
  const match = msg.match(regex);

  if (!match) {
    return;
  }

  if (recentMessages.length === data.msgCap) {
    recentMessages.shift();
  }

  if (!userColors[match[1]]) {
    userColors[match[1]] = colorCodes[Math.floor(Math.random() * colorCodes.length)];
  }

  let formattedMsg = [`${userColors[match[1]]}${match[1]}§r: ${match[2]}`, 0];
  if((Renderer.getStringWidth(formattedMsg[0]) + data.x) * data.scale > Renderer.screen.getWidth()) {
    formattedMsg = createWrappedString(formattedMsg[0]);
  }
  recentMessages.push(formattedMsg);
  console.log(msg);
}

const createWrappedString = (str) => {
  let totalNewLines = 0;
  let formattedMsg = "";
  let testMsg = "";

  let words = str.split(" ");
  for (let i = 0; i < words.length; i++) {
    let word = words[i];
    let tempTestMsg = testMsg + word;

    if ((Renderer.getStringWidth(tempTestMsg) + data.x) * data.scale > Renderer.screen.getWidth()) {
      testMsg = testMsg + "\n";
      formattedMsg += testMsg;
      testMsg = word;
      totalNewLines++;
    } else {
      testMsg = testMsg + " " + word;
    }
  }

  if (totalNewLines === 0) {
    formattedMsg = testMsg;
  }
  return [formattedMsg, totalNewLines];
};


ws.onClose = () => {
  if (data.stayConnected) {
    ws.reconnect();
    console.log("ws reconnected")
    return;
  }
  // ChatLib.chat("&7closed");
  console.log("ws connection closed");
}

ws.onError = (exception) => {
  console.log("Error: " + exception);
}


let recentMessages = [];

registerWhen(register("renderOverlay", (event) => {
  let total = 0;
  for (let i=0; i<recentMessages.length; i++) {
    let msg = recentMessages[i];
    let txt = msg[0];
    let extraLines = msg[1];
    Renderer.scale(data.scale);
    Renderer.drawStringWithShadow(txt, data.x, data.y + (8 * total));
    total += extraLines;
    total += 1;
  }
}), () => data.toggled);

register("dragged", (dx, dy, x, y, b) => {
  if (!moveGUI.isOpen()) {
    return;
  }

  data.x = x / data.scale;
  data.y = y / data.scale;
  data.save();
});

register("scrolled", (x, y, dir) => {
  if (!moveGUI.isOpen()) {
    return;
  }

  if (dir > 0) {
    data.scale += 0.05;
  } else {
    data.scale -= 0.05;
  }
});

