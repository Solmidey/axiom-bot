const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

/* ================= CONFIG ================= */

const TOKEN = process.env.DISCORD_TOKEN;
const CHARACTER_CHANNEL_ID = "1460562861339312260";
const MAX_EARLY_BELIEVERS = 500;

/* ===== ROLE IDS (REPLACE ALL IDS) ===== */

const ROLE_IDS = {
  EARLY_BELIEVER: "1460203762940641372",
  ALIGNMENT_LOCK: "1460628083307708654",

  BEARERS: {
    Flame: "1460530799676756030",
    Veil: "1460531430043156767",
    Echo: "1460531650109903013",
    Crown: "1460531822193676414"
  },

  FACTIONS: {
    Kael: "1460201480446414985",
    Nyra: "1460201918587605135",
    Eron: "1460202055607128243",
    Seris: "1460203000659312844",
    Ilios: "ILIOS_ROLE_ID"
  }
};

/* ===== FACTION → BEARER MAP ===== */

const FACTION_TO_BEARER = {
  Kael: "Flame",
  Nyra: "Veil",
  Eron: "Echo",
  Seris: "Crown",
  Ilios: "Echo"
};

/* ======================================== */

client.once(Events.ClientReady, async () => {
  console.log(`Axiom online as ${client.user.tag}`);

  const channel = await client.channels.fetch(CHARACTER_CHANNEL_ID);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("Kael").setLabel("Kael").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("Nyra").setLabel("Nyra").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("Eron").setLabel("Eron").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("Seris").setLabel("Seris").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("Ilios").setLabel("Ilios").setStyle(ButtonStyle.Secondary)
  );

  await channel.send({
    content:
      "⚠️ **Choose carefully.**\n\n" +
      "Your faction alignment carries weight in the story.\n" +
      "Once chosen, you will be **locked for the entire season**.\n\n" +
      "_This decision cannot be changed until the next Episode or Season._",
    components: [row]
  });
});

/* ===== EARLY BELIEVER AUTO-ASSIGN ===== */

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const role = member.guild.roles.cache.get(ROLE_IDS.EARLY_BELIEVER);
    if (!role) return;
    if (role.members.size >= MAX_EARLY_BELIEVERS) return;

    await member.roles.add(role);
  } catch (err) {
    console.error("Early Believer error:", err);
  }
});

/* ===== BUTTON HANDLER WITH LOCK ===== */

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const faction = interaction.customId;
  if (!ROLE_IDS.FACTIONS[faction]) return;

  try {
    const member = interaction.member;

    // 🚫 Check alignment lock
    if (member.roles.cache.has(ROLE_IDS.ALIGNMENT_LOCK)) {
      await interaction.reply({
        content:
          "🔒 **Your alignment is sealed.**\n\n" +
          "Faction allegiance is locked for this season.\n" +
          "You will be able to realign in a future episode.\n\n" +
          "_Power comes from commitment._",
        ephemeral: true
      });
      return;
    }

    // 1️⃣ Remove all bearer roles
    for (const roleId of Object.values(ROLE_IDS.BEARERS)) {
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
      }
    }

    // 2️⃣ Remove all faction roles
    for (const roleId of Object.values(ROLE_IDS.FACTIONS)) {
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
      }
    }

    // 3️⃣ Assign faction
    await member.roles.add(ROLE_IDS.FACTIONS[faction]);

    // 4️⃣ Assign corresponding bearer
    const bearerKey = FACTION_TO_BEARER[faction];
    await member.roles.add(ROLE_IDS.BEARERS[bearerKey]);

    // 5️⃣ Lock alignment
    await member.roles.add(ROLE_IDS.ALIGNMENT_LOCK);

    // 6️⃣ Private confirmation
    await interaction.reply({
      content:
        `✨ **Alignment sealed.**\n\n` +
        `You have sworn allegiance to **${faction}**.\n` +
        `You now walk as a **Bearer of ${bearerKey}**.\n\n` +
        `_This bond will endure until the next season._`,
      ephemeral: true
    });

  } catch (err) {
    console.error("Alignment error:", err);

    if (!interaction.replied) {
      await interaction.reply({
        content: "⚠️ Alignment failed. Please contact an admin.",
        ephemeral: true
      });
    }
  }
});

client.login(TOKEN);

client.on("error", (error) => {
  console.error("Bot encountered an error:", error);
});
