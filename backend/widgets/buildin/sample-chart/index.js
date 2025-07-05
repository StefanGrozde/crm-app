(function() {
    const widget = {
        init: function(container) {
            this.container = container;
            this.render();
            this.startDataRefresh();
        },
        
        render: function() {
            this.container.innerHTML = `
                <div class="widget-header">
                    <h3>Sample Chart</h3>
                    <span class="widget-refresh" onclick="widget.refresh()">🔄</span>
                </div>
                <div class="widget-content">
                    <canvas id="chart-${this.container.id}" width="100%" height="200"></canvas>
                </div>
            `;
        },
        
        refresh: function() {
            // Refresh widget data
            console.log('Refreshing widget data...');
            this.loadData();
        },
        
        loadData: function() {
            // Simulate loading data
            const data = Array.from({length: 10}, () => Math.random() * 100);
            this.renderChart(data);
        },
        
        renderChart: function(data) {
            const canvas = document.getElementById(`chart-${this.container.id}`);
            const ctx = canvas.getContext('2d');
            
            // Simple chart rendering
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            data.forEach((value, index) => {
                const x = (index / (data.length - 1)) * canvas.width;
                const y = canvas.height - (value / 100) * canvas.height;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
        },
        
        startDataRefresh: function() {
            setInterval(() => {
                this.loadData();
            }, 30000); // Refresh every 30 seconds
        }
    };
    
    // Initialize widget when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            widget.init(document.currentScript.parentElement);
        });
    } else {
        widget.init(document.currentScript.parentElement);
    }
})();