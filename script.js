class ImageMapGenerator {
    constructor() {
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.image = document.getElementById('displayImage');
        this.currentTool = 'select';
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.hotspots = [];
        this.selectedHotspot = null;
        this.polygonPoints = [];
        this.isDrawingPolygon = false;
        this.modalHotspot = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateHotspotsTable();
    }

    setupEventListeners() {
        // Upload tabs
        document.querySelectorAll('.upload-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // File upload
        document.getElementById('imageUpload').addEventListener('change', (e) => {
            this.loadImageFromFile(e.target.files[0]);
        });

        // URL load
        document.getElementById('loadUrl').addEventListener('click', () => {
            this.loadImageFromUrl();
        });

        // Tool selection
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (e.target.closest('#clearAll')) {
                    this.clearAll();
                } else if (e.target.closest('#undo')) {
                    this.undo();
                } else {
                    this.selectTool(e.target.closest('.tool-btn').dataset.tool);
                }
            });
        });

        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.onClick(e));

        // Modal events
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal.id === 'hotspotModal') {
                    this.closeModal();
                } else if (modal.id === 'selectedHotspotModal') {
                    this.closeSelectedModal();
                }
            });
        });
        document.getElementById('saveHotspot').addEventListener('click', () => this.saveModalHotspot());
        document.getElementById('cancelHotspot').addEventListener('click', () => this.closeModal());
        
        // Selected hotspot modal events
        document.getElementById('updateHotspot').addEventListener('click', () => this.updateSelectedHotspot());
        document.getElementById('deleteHotspot').addEventListener('click', () => this.deleteSelectedHotspot());
        document.getElementById('clearSelection').addEventListener('click', () => this.clearSelection());

        // Code generation
        document.getElementById('generateCode').addEventListener('click', () => this.generateCode());
        document.getElementById('copyCode').addEventListener('click', () => this.copyCodeToClipboard());
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.upload-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    loadImageFromFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.image.src = e.target.result;
            this.image.onload = () => {
                this.setupCanvas();
            };
        };
        reader.readAsDataURL(file);
    }

    loadImageFromUrl() {
        const url = document.getElementById('imageUrl').value.trim();
        if (!url) {
            alert('Please enter a valid URL.');
            return;
        }

        this.image.src = url;
        this.image.onload = () => {
            this.setupCanvas();
        };
        this.image.onerror = () => {
            alert('Failed to load image from URL.');
        };
    }

    setupCanvas() {
        this.image.style.display = 'block';
        this.canvas.width = this.image.naturalWidth;
        this.canvas.height = this.image.naturalHeight;
        this.canvas.style.width = this.image.offsetWidth + 'px';
        this.canvas.style.height = this.image.offsetHeight + 'px';
        this.redrawCanvas();
    }

    selectTool(tool) {
        this.currentTool = tool;
        this.polygonPoints = [];
        this.isDrawingPolygon = false;
        
        // Update tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');

        // Update cursor
        this.canvas.style.cursor = tool === 'select' ? 'default' : 'crosshair';
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    onMouseDown(e) {
        if (this.currentTool === 'select') return;
        
        const pos = this.getMousePos(e);
        this.startX = pos.x;
        this.startY = pos.y;
        this.isDrawing = true;
    }

    onMouseMove(e) {
        if (!this.isDrawing) return;

        const pos = this.getMousePos(e);
        this.redrawCanvas();

        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);

        if (this.currentTool === 'rectangle') {
            const width = pos.x - this.startX;
            const height = pos.y - this.startY;
            this.ctx.strokeRect(this.startX, this.startY, width, height);
        } else if (this.currentTool === 'circle') {
            const radius = Math.sqrt(Math.pow(pos.x - this.startX, 2) + Math.pow(pos.y - this.startY, 2));
            this.ctx.beginPath();
            this.ctx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
            this.ctx.stroke();
        }
    }

    onMouseUp(e) {
        if (!this.isDrawing) return;

        const pos = this.getMousePos(e);
        this.isDrawing = false;

        if (this.currentTool === 'rectangle') {
            this.createRectangle(this.startX, this.startY, pos.x - this.startX, pos.y - this.startY);
        } else if (this.currentTool === 'circle') {
            const radius = Math.sqrt(Math.pow(pos.x - this.startX, 2) + Math.pow(pos.y - this.startY, 2));
            this.createCircle(this.startX, this.startY, radius);
        }
    }

    onClick(e) {
        if (this.currentTool === 'select') {
            this.selectHotspot(e);
        } else if (this.currentTool === 'polygon') {
            this.addPolygonPoint(e);
        }
    }

    addPolygonPoint(e) {
        const pos = this.getMousePos(e);
        
        if (!this.isDrawingPolygon) {
            this.polygonPoints = [pos];
            this.isDrawingPolygon = true;
        } else {
            // Check if clicking near the first point to close polygon
            const firstPoint = this.polygonPoints[0];
            const distance = Math.sqrt(Math.pow(pos.x - firstPoint.x, 2) + Math.pow(pos.y - firstPoint.y, 2));
            
            if (distance < 10 && this.polygonPoints.length >= 3) {
                this.createPolygon([...this.polygonPoints]);
                this.polygonPoints = [];
                this.isDrawingPolygon = false;
            } else {
                this.polygonPoints.push(pos);
            }
        }
        
        this.redrawCanvas();
        this.drawPolygonPreview();
    }

    createRectangle(x, y, width, height) {
        const hotspot = {
            id: Date.now(),
            type: 'rectangle',
            x: Math.min(x, x + width),
            y: Math.min(y, y + height),
            width: Math.abs(width),
            height: Math.abs(height),
            link: '',
            title: '',
            target: '_self'
        };
        
        this.hotspots.push(hotspot);
        this.showModal(hotspot);
        this.updateHotspotsTable();
        this.redrawCanvas();
    }

    createCircle(x, y, radius) {
        const hotspot = {
            id: Date.now(),
            type: 'circle',
            cx: x,
            cy: y,
            r: radius,
            link: '',
            title: '',
            target: '_self'
        };
        
        this.hotspots.push(hotspot);
        this.showModal(hotspot);
        this.updateHotspotsTable();
        this.redrawCanvas();
    }

    createPolygon(points) {
        const hotspot = {
            id: Date.now(),
            type: 'polygon',
            points: points,
            link: '',
            title: '',
            target: '_self'
        };
        
        this.hotspots.push(hotspot);
        this.showModal(hotspot);
        this.updateHotspotsTable();
        this.redrawCanvas();
    }

    selectHotspot(e) {
        const pos = this.getMousePos(e);
        this.selectedHotspot = null;

        for (let hotspot of this.hotspots) {
            if (this.isPointInHotspot(pos, hotspot)) {
                this.selectedHotspot = hotspot;
                this.showSelectedProperties(hotspot);
                break;
            }
        }

        if (!this.selectedHotspot) {
            this.closeSelectedModal();
        }

        this.redrawCanvas();
    }

    isPointInHotspot(point, hotspot) {
        switch (hotspot.type) {
            case 'rectangle':
                return point.x >= hotspot.x && point.x <= hotspot.x + hotspot.width &&
                       point.y >= hotspot.y && point.y <= hotspot.y + hotspot.height;
            
            case 'circle':
                const distance = Math.sqrt(Math.pow(point.x - hotspot.cx, 2) + Math.pow(point.y - hotspot.cy, 2));
                return distance <= hotspot.r;
            
            case 'polygon':
                return this.isPointInPolygon(point, hotspot.points);
            
            default:
                return false;
        }
    }

    isPointInPolygon(point, vertices) {
        let inside = false;
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            if (((vertices[i].y > point.y) !== (vertices[j].y > point.y)) &&
                (point.x < (vertices[j].x - vertices[i].x) * (point.y - vertices[i].y) / (vertices[j].y - vertices[i].y) + vertices[i].x)) {
                inside = !inside;
            }
        }
        return inside;
    }

    showModal(hotspot) {
        this.modalHotspot = hotspot;
        document.getElementById('modalLink').value = hotspot.link;
        document.getElementById('modalTitle').value = hotspot.title;
        document.getElementById('modalTarget').value = hotspot.target;
        document.getElementById('hotspotModal').style.display = 'block';
    }

    closeModal() {
        document.getElementById('hotspotModal').style.display = 'none';
        this.modalHotspot = null;
    }

    closeSelectedModal() {
        document.getElementById('selectedHotspotModal').style.display = 'none';
    }

    saveModalHotspot() {
        if (!this.modalHotspot) return;

        this.modalHotspot.link = document.getElementById('modalLink').value;
        this.modalHotspot.title = document.getElementById('modalTitle').value;
        this.modalHotspot.target = document.getElementById('modalTarget').value;

        this.selectedHotspot = this.modalHotspot;
        this.showSelectedProperties(this.modalHotspot);
        this.updateHotspotsTable();
        this.closeModal();
    }

    showSelectedProperties(hotspot) {
        document.getElementById('selectedLink').value = hotspot.link;
        document.getElementById('selectedTitle').value = hotspot.title;
        document.getElementById('selectedTarget').value = hotspot.target;
        document.getElementById('selectedHotspotModal').style.display = 'block';
    }

    hideSelectedProperties() {
        document.getElementById('selectedHotspotModal').style.display = 'none';
    }

    clearSelection() {
        this.selectedHotspot = null;
        this.closeSelectedModal();
        this.redrawCanvas();
    }

    updateSelectedHotspot() {
        if (!this.selectedHotspot) return;

        this.selectedHotspot.link = document.getElementById('selectedLink').value;
        this.selectedHotspot.title = document.getElementById('selectedTitle').value;
        this.selectedHotspot.target = document.getElementById('selectedTarget').value;

        this.updateHotspotsTable();
        this.closeSelectedModal();
        this.redrawCanvas();
    }

    deleteSelectedHotspot() {
        if (!this.selectedHotspot) return;

        this.hotspots = this.hotspots.filter(h => h.id !== this.selectedHotspot.id);
        this.selectedHotspot = null;
        this.closeSelectedModal();
        this.updateHotspotsTable();
        this.redrawCanvas();
    }

    updateHotspotsTable() {
        const tbody = document.querySelector('#hotspotsTable tbody');
        tbody.innerHTML = '';

        this.hotspots.forEach((hotspot, index) => {
            const row = tbody.insertRow();
            row.style.cursor = 'pointer';
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${hotspot.type}</td>
                <td>${hotspot.link || 'N/A'}</td>
                <td>${hotspot.title || 'N/A'}</td>
                <td>${hotspot.target}</td>
                <td><button class="delete-btn" onclick="generator.deleteHotspot(${hotspot.id})">Delete</button></td>
            `;
            
            // Add click to select
            row.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-btn')) {
                    this.selectedHotspot = hotspot;
                    this.showSelectedProperties(hotspot);
                    this.redrawCanvas();
                }
            });
        });
    }

    deleteHotspot(id) {
        this.hotspots = this.hotspots.filter(h => h.id !== id);
        if (this.selectedHotspot && this.selectedHotspot.id === id) {
            this.selectedHotspot = null;
            this.closeSelectedModal();
        }
        this.updateHotspotsTable();
        this.redrawCanvas();
    }

    clearAll() {
        if (confirm('Are you sure you want to clear all hotspots?')) {
            this.hotspots = [];
            this.selectedHotspot = null;
            this.polygonPoints = [];
            this.isDrawingPolygon = false;
            this.closeSelectedModal();
            this.updateHotspotsTable();
            this.redrawCanvas();
        }
    }

    undo() {
        if (this.hotspots.length > 0) {
            this.hotspots.pop();
            this.selectedHotspot = null;
            this.closeSelectedModal();
            this.updateHotspotsTable();
            this.redrawCanvas();
        }
    }

    redrawCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw all hotspots
        this.hotspots.forEach(hotspot => {
            this.drawHotspot(hotspot, hotspot === this.selectedHotspot);
        });

        // Draw polygon preview if drawing
        if (this.isDrawingPolygon && this.polygonPoints.length > 0) {
            this.drawPolygonPreview();
        }
    }

    drawHotspot(hotspot, isSelected = false) {
        this.ctx.strokeStyle = isSelected ? '#e74c3c' : '#3498db';
        this.ctx.fillStyle = isSelected ? 'rgba(231, 76, 60, 0.2)' : 'rgba(52, 152, 219, 0.2)';
        this.ctx.lineWidth = isSelected ? 3 : 2;
        this.ctx.setLineDash([]);

        switch (hotspot.type) {
            case 'rectangle':
                this.ctx.fillRect(hotspot.x, hotspot.y, hotspot.width, hotspot.height);
                this.ctx.strokeRect(hotspot.x, hotspot.y, hotspot.width, hotspot.height);
                break;
            
            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(hotspot.cx, hotspot.cy, hotspot.r, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.stroke();
                break;
            
            case 'polygon':
                this.ctx.beginPath();
                this.ctx.moveTo(hotspot.points[0].x, hotspot.points[0].y);
                for (let i = 1; i < hotspot.points.length; i++) {
                    this.ctx.lineTo(hotspot.points[i].x, hotspot.points[i].y);
                }
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                break;
        }
    }

    drawPolygonPreview() {
        if (this.polygonPoints.length === 0) return;

        this.ctx.strokeStyle = '#3498db';
        this.ctx.fillStyle = 'rgba(52, 152, 219, 0.2)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);

        this.ctx.beginPath();
        this.ctx.moveTo(this.polygonPoints[0].x, this.polygonPoints[0].y);
        for (let i = 1; i < this.polygonPoints.length; i++) {
            this.ctx.lineTo(this.polygonPoints[i].x, this.polygonPoints[i].y);
        }
        this.ctx.stroke();

        // Draw points
        this.polygonPoints.forEach(point => {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
            this.ctx.fill();
        });
    }

    generateCode() {
        if (!this.image.src || this.hotspots.length === 0) {
            document.getElementById('codeOutput').value = 'Please load an image and create at least one hotspot.';
            return;
        }

        const imageSrc = this.image.src;
        let html = `<img src="${imageSrc}" usemap="#imagemap" alt="Image Map">\n\n`;
        html += `<map name="imagemap">\n`;

        this.hotspots.forEach(hotspot => {
            const link = hotspot.link || '#';
            const title = hotspot.title ? ` title="${hotspot.title}"` : '';
            const target = hotspot.target !== '_self' ? ` target="${hotspot.target}"` : '';

            switch (hotspot.type) {
                case 'rectangle':
                    html += `  <area shape="rect" coords="${Math.round(hotspot.x)},${Math.round(hotspot.y)},${Math.round(hotspot.x + hotspot.width)},${Math.round(hotspot.y + hotspot.height)}" href="${link}"${title}${target}>\n`;
                    break;
                
                case 'circle':
                    html += `  <area shape="circle" coords="${Math.round(hotspot.cx)},${Math.round(hotspot.cy)},${Math.round(hotspot.r)}" href="${link}"${title}${target}>\n`;
                    break;
                
                case 'polygon':
                    const coords = hotspot.points.map(p => `${Math.round(p.x)},${Math.round(p.y)}`).join(',');
                    html += `  <area shape="poly" coords="${coords}" href="${link}"${title}${target}>\n`;
                    break;
            }
        });

        html += `</map>`;
        document.getElementById('codeOutput').value = html;
    }

    copyCodeToClipboard() {
        const codeOutput = document.getElementById('codeOutput');
        codeOutput.select();
        codeOutput.setSelectionRange(0, 99999);
        
        try {
            document.execCommand('copy');
            alert('Code copied to clipboard!');
        } catch (err) {
            alert('Failed to copy code. Please copy manually.');
        }
    }
}

// Initialize the application
const generator = new ImageMapGenerator();