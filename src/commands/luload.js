export default {
  name: "luload",
  description: "Owner-only: dynamically load a command or handler",
  options: [
    {
      name: "target",
      description: "What to load",
      type: 3,
      required: true,
      choices: [
        { name: "command", value: "command" },
        { name: "handler", value: "handler" }
      ]
    },
    {
      name: "name",
      description: "Name of the command or handler",
      type: 3,
      required: true
    }
  ],
  execute: async (interaction) => {
    const OWNER_IDS = ["1362053982444454119", "985500882420514856"];
    const userId = interaction.member?.user?.id || interaction.user?.id;
    if (!OWNER_IDS.includes(userId)) {
      return interaction.createMessage({ content: "Owner only.", flags: 64 });
    }

    const target = interaction.data.options?.find(o => o.name === "target")?.value;
    const name = interaction.data.options?.find(o => o.name === "name")?.value?.toLowerCase();

    if (!target || !name) {
      return interaction.createMessage({ content: "Usage: /luload target:<command|handler> name:<name>", flags: 64 });
    }

    try {
      if (target === "handler") {
        const url = new URL(`../handlers/${name}.js?update=${Date.now()}`, import.meta.url);
        await import(url.href);
        await interaction.createMessage({ content: `Loaded handler: \`${name}\``, flags: 64 });
      } else {
        const url = new URL(`./${name}.js?update=${Date.now()}`, import.meta.url);
        const newCommand = (await import(url.href)).default;
        interaction._client.commands.set(newCommand.name, newCommand);
        await interaction.createMessage({ content: `Loaded command: \`${name}\``, flags: 64 });
      }
    } catch (error) {
      await interaction.createMessage({ content: `Load failed: \`${error?.message || error}\``, flags: 64 });
    }
  }
};

