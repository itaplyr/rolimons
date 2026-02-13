
<p align="center">
  <img src="/assets/Icon.png" alt="Rolimons"/>
</p>

# Rolimons
- An updated version of a Eolimons api wrapper
- This project was made by @itaplyr (forked from [Shiawaseu](https://github.com/Shiawaseu/rolimons), huge thanks!) for a service available through our [Discord Server](https://discord.gg/a9CHhuKS9m), or our [Website](https://rolitools.site).

## Installation
```
npm install git+https://github.com/itaplyr/rolimons
```

## Example usage
```javascript
const rolimons = require("rolimons")

rolimons.items.searchItem("name", "SSHF").then(
    function(item) {
        if (!item) return;
        console.log(item.name, "which is also known as", item.acronym, "has a demand of", item.demand)
})
```

## Covered endpoints
- V2 Items (**+ Caching**) & UAID tracking
- Market Activity (trade ads)
- Groups
- Games
- Players & Leaderboard
