export default {
    name: 'donate',
    description: 'Provides information on how to support the project.',
    async execute(interaction) {
        const embed = {
            title: 'Support the Project',
            description: 'Donating helps Lustra run. Your support is greatly appreciated and helps cover server costs, development time, and new features. Thank you for considering a donation!',
            color: 0xcdb4db, 
            type: 'rich',
        };

        const components = [
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 5,
                        label: 'Donate via PayPal',
                        url: 'https://paypal.me/AmeliaKennedy2',
                    },
                    {
                        type: 2,
                        style: 2,
                        label: 'Donate via Crypto',
                        custom_id: 'donate_crypto',
                    },
                ],
            },
        ];

        return interaction.createMessage({ embeds: [embed], components });
    },
};