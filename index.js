import PriceUtils from "../BloomCore/PriceUtils"
import { fn, getSkyblockItemID } from "../BloomCore/utils/Utils"
import ListFix from "../ListFix/"
import PartyV2 from "../BloomCore/PartyV2"
import Dungeon from "../BloomCore/dungeons/Dungeon"
import { onChatPacket } from "../BloomCore/utils/Events"

// --- Feature toggles --- \\
let showItemPrice = true
let showItemValue = true
let showTerminalTracker = true

// --- Commands to toggle features --- \\
register("command", (arg) => {
    if (!arg) {
        ChatLib.chat("&d[Flower] &7Usage: /flower <price|value|terms>")
        return
    }

    switch (arg.toLowerCase()) {
        case "price":
            showItemPrice = !showItemPrice
            ChatLib.chat(`&d[Flower] &7Item Price Lore: ${showItemPrice ? "&aEnabled" : "&cDisabled"}`)
            break

        case "value":
            showItemValue = !showItemValue
            ChatLib.chat(`&d[Flower] &7Item Value: ${showItemValue ? "&aEnabled" : "&cDisabled"}`)
            break

        case "terms":
            showTerminalTracker = !showTerminalTracker
            ChatLib.chat(`&d[Flower] &7Terminal Tracker: ${showTerminalTracker ? "&aEnabled" : "&cDisabled"}`)
            break

        default:
            ChatLib.chat("&d[Flower] &7Unknown option. Use: /flower <price|value|terms>")
            break
    }
}).setName("flower")

// --- Item Price Lore --- \\
const handleItemPrice = (res, id, item, event) => {
    if (!showItemPrice || !item) return
    const [ price, location ] = res

    if (location === PriceUtils.locations.AUCTION) {
        ListFix.add(event, "toolTip", `§dLowest BIN: §6${fn(Math.floor(price))} coins`)
        return
    }
    if (location !== PriceUtils.locations.BAZAAR) return

    const buyPrice = PriceUtils.getPrice(id, false) ?? 0
    if (Keyboard.isKeyDown(Keyboard.KEY_LSHIFT)) {
        ListFix.add(event, "toolTip", `§dBazaar Insta-Buy: §6${fn(Math.floor(buyPrice * item.getStackSize()))} coins`)
        ListFix.add(event, "toolTip", `§dBazaar Insta-Sell: §6${fn(Math.floor(price * item.getStackSize()))} coins`)
        return
    }

    ListFix.add(event, "toolTip", `§dBazaar Insta-Buy: §6${fn(Math.floor(buyPrice))} coins`)
    ListFix.add(event, "toolTip", `§dBazaar Insta-Sell: §6${fn(Math.floor(price))} coins`)
}

const handleItemValue = (item, event) => {
    if (!showItemValue) return
    const value = PriceUtils.getItemValue(item)
    if (value == null) return
    ListFix.add(event, "toolTip", `§dItem Value: §6${fn(Math.floor(value))} coins`)
}

register(net.minecraftforge.event.entity.player.ItemTooltipEvent, (event) => {
    const item = new Item(event.itemStack)
    const sbID = getSkyblockItemID(item)
    if (!sbID) return

    const value = PriceUtils.getSellPrice(sbID, true) ?? 0
    if (value == null) return

    handleItemPrice(value, sbID, item, event)
    handleItemValue(item, event)
})

// --- Termtracker --- \\
const completed = new Map() // "player": {terminal: 0, device: 0, lever: 0}

onChatPacket(() => {
    completed.clear()
    Dungeon.party.forEach(player => {
        completed.set(player, {terminal: 0, device: 0, lever: 0})
    })
}).setCriteria("[BOSS] Goldor: Who dares trespass into my domain?")

onChatPacket((player, type) => {
    if (!showTerminalTracker || !completed.has(player)) return
    const data = completed.get(player)
    data[type]++
}).setCriteria(/^(\w{1,16}) (?:activated|completed) a (\w+)! \(\d\/\d\)$/)

register("chat", () => {
    if (!showTerminalTracker) return
    completed.forEach((data, player) => {
        const formatted = PartyV2.getFormattedName(player)
        ChatLib.chat(`${formatted} &8| &6${data.terminal} &aTerminals &8| &6${data.device} &aDevices &8| &6${data.lever} &aLevers`)
    })
}).setCriteria("The Core entrance is opening!")

register("worldUnload", () => {
    completed.clear()
})