// Create chart with horizontal animation
function createChart(stats, pokemonName) {
    if (myChart) myChart.destroy();
    
    const statLabels = ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'];
    const statValues = stats.map(stat => stat.base_stat);
    const totalStat = statValues.reduce((sum, val) => sum + val, 0);
    const backgroundColors = statValues.map(value => getGradientColor(value));
    const borderColors = statValues.map(value => getGradientColor(value).replace('0.6', '1'));

    // Adjust chart size based on screen width
    const isMobile = window.innerWidth <= 768;
    const barThickness = isMobile ? 20 : 25;
    const fontSize = isMobile ? 10 : 13;

    myChart = new Chart(statChart, {
        type: 'bar',
        data: {
            labels: statLabels,
            datasets: [{
                label: `Base Stat Total: ${totalStat}`,
                data: statValues,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1,
                barThickness: barThickness
            }]
        },
        options: {
            devicePixelRatio: window.devicePixelRatio || 2,
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            animation: {
                duration: 1200,
                easing: 'easeOutQuart',
                x: {
                    from: 0,
                    duration: 1200,
                    easing: 'easeOutQuart'
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 255,
                    display: false
                },
                y: {
                    title: {
                        display: false
                    },
                    ticks: {
                        color: '#d1d5db',
                        font: {
                            size: fontSize
                        },
                        padding: 5
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#f3f4f6',
                        font: {
                            size: fontSize
                        }
                    }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'end',
                    formatter: (value) => value,
                    color: '#ffffff',
                    font: {
                        weight: 'bold',
                        size: fontSize - 1
                    }
                }
            }
        }});
}