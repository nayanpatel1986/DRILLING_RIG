# DrillBit - Digital Twin & Condition Monitoring for NOV E-1400

A high-performance Digital Twin application for drilling rigs, featuring **sub-100ms latency** real-time WITSML data ingestion, condition monitoring, and drilling optimization analytics.

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/nayanpatel1986/DRIILBIT_TWIN)
[![Latency](https://img.shields.io/badge/latency-<100ms-green.svg)](RELEASE_NOTES.md)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)

## 🚀 What's New in v2.0.0

**99.2% Latency Reduction** - Optimized from 10-12 seconds to **<100ms**

- ⚡ **WebSocket Real-Time Push** - Instant data updates (no polling delay)
- 📊 **20 Hz Update Rate** - 20 updates per second vs 1 previously
- 🔄 **Automatic Failover** - Falls back to HTTP polling if needed
- 📈 **Performance Monitoring** - Real-time latency display

See [RELEASE_NOTES.md](RELEASE_NOTES.md) for complete details.

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed and running

### Installation

```bash
# Clone repository
git clone https://github.com/nayanpatel1986/DRIILBIT_TWIN.git
cd DRIILBIT_TWIN

# Checkout optimized version (recommended)
git checkout latency-optimization

# Start services
docker-compose down -v  # Optional: Clean start
docker-compose build
docker-compose up -d

# Monitor logs
docker-compose logs -f backend
```

### Accessing the Application

- **Frontend Dashboard**: http://localhost:8081
- **Backend API Docs**: http://localhost:8000/docs when `ENV=development`
- **InfluxDB UI**: http://localhost:8087 (User: admin, Pass: password123)
- **WebSocket Stats**: http://localhost:8000/ws/stats

### Verify Performance

Look for these indicators of successful optimization:
- ✅ Dashboard shows: **"⚡ Real-time (45ms latency)"** with green indicator
- ✅ Backend logs show: **"⚡ Performance: Poll=45ms, Write=28ms, Total=95ms"**
- ✅ WebSocket connected in browser console
- ✅ Smooth 20Hz dashboard updates

## 🏗 Architecture

### Technology Stack
- **Frontend**: React 18, Vite, TailwindCSS, Recharts, WebSocket
- **Backend**: Python FastAPI, Pandas, WebSocket Server
- **Data Layer**: InfluxDB (Time-series), PostgreSQL (Metadata), Mosquitto (MQTT)
- **Ingestion**: WITSML 1.4.1/2.0, Modbus TCP (planned)
- **Deployment**: Docker, Docker Compose

### Performance Architecture (v2.0.0)
```
Sensor → Analytics (50ms) → InfluxDB → WebSocket → Dashboard
         [20 Hz polling]    [-5m query] [push updates]
         
Total End-to-End Latency: <100ms (95ms average)
```

## 🌟 Key Features

### Real-Time Monitoring
1. **Rig Overview** - 3D-style drilling status with live parameters
2. **WebSocket Push Updates** - Sub-100ms latency from sensor to dashboard  
3. **Performance Indicators** - Live connection status and latency display
4. **Automatic Failover** - Seamless fallback to polling if WebSocket fails

### Analytics & Monitoring
1. **Equipment Health** - Condition monitoring for Engines, Pumps, Drawworks
2. **Real-Time EDR** - Depth-based logging of ROP, WOB, Torque
3. **PVR Analytics** - Parameter vs Rate optimization plots (MSE analysis)
4. **Safety Monitoring** - Kick detection, stuck pipe risk (planned)

### Data & Integration
1. **WITSML Support** - 1.4.1 and 2.0 protocol support
2. **Modbus TCP** - Real-time PLC integration (planned)
3. **Historical Analysis** - Time-series queries and trends
4. **Automated Reports** - Daily drilling and performance reports

## 📊 Performance Benchmarks

| Metric | v1.0.0 | v2.0.0 | Improvement |
|--------|--------|--------|-------------|
| End-to-End Latency | 10-12s | 95ms | 99.2% ⬇️ |
| Backend Poll Rate | 1 Hz | 20 Hz | 20x ⬆️ |
| InfluxDB Query | 200ms | 30ms | 85% ⬇️ |
| Dashboard Updates | Polling | Push | Real-time ✅ |

See [OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md) for detailed analysis.

## 🔧 Development

### Run Frontend Locally
```bash
cd frontend
npm install
npm run dev
# Access at http://localhost:3001
```

The Vite dev server proxies API traffic to `http://localhost:8000` by default.
If your backend is reachable on a different host, set `VITE_API_PROXY_TARGET`
and optionally `VITE_WS_PROXY_TARGET` before running `npm run dev`.

### Run Backend Locally
```bash
cd backend
pip install -r requirements.txt --break-system-packages
uvicorn main:app --reload --host 0.0.0.0 --port 8000
# API docs at http://localhost:8000/docs
```

Backend authentication now requires `JWT_SECRET` to be set before startup.
Copy `.env.example` to `.env` and provide a strong secret for local and
production environments.

The Docker stack defaults the backend to `ENV=production`, which disables
public registration after the initial bootstrap user and hides `/docs`.
Set `ENV=development` only when you intentionally want development behavior.

### Test WebSocket Connection
```javascript
// In browser console at http://localhost:3001
const ws = new WebSocket('ws://localhost:3001/ws/realtime');
ws.onmessage = (e) => console.log('Data:', JSON.parse(e.data));
```

## 📚 Documentation

- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[RELEASE_NOTES.md](RELEASE_NOTES.md)** - Version 2.0.0 release notes
- **[CHANGELOG.md](CHANGELOG.md)** - Version history
- **[OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md)** - Technical optimization details
- **[implementation_guide.md](implementation_guide.md)** - Step-by-step implementation
- **[latency_optimization_plan.md](latency_optimization_plan.md)** - Detailed analysis

## 🗺️ Roadmap

### v2.1.0 (Next 2 weeks)
- [ ] Modbus TCP integration
- [ ] Advanced safety analytics (kick detection)
- [ ] Redis caching layer (<50ms latency)
- [ ] Grafana monitoring dashboard

### v2.2.0 (Next month)
- [ ] Machine learning ROP prediction
- [ ] Automated drilling optimization
- [ ] Mobile application (iOS/Android)
- [ ] Multi-rig fleet management

### v3.0.0 (Future)
- [ ] Apache Kafka streaming
- [ ] Digital twin physics simulation
- [ ] Augmented reality visualization
- [ ] Autonomous drilling optimization

## 🐛 Troubleshooting

### WebSocket Not Connecting
```bash
# Check nginx configuration
docker-compose logs frontend | grep WebSocket

# Verify WebSocket endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
     http://localhost:8000/ws/realtime

# Restart services
docker-compose restart
```

### High Latency
```bash
# Check analytics sleep time
docker-compose logs backend | grep "Performance"

# Verify InfluxDB query range
docker-compose logs backend | grep "range(start:"

# Restart backend
docker-compose restart backend
```

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#troubleshooting) for complete troubleshooting guide.

## 📝 Version Control

### Branches
- `main` - Stable release (v1.0.0)
- `latency-optimization` - Performance optimized (v2.0.0) ⭐ **Recommended**
- Feature branches follow: `feature/feature-name`
- Bugfix branches follow: `bugfix/issue-description`

### Versioning
We use [Semantic Versioning](https://semver.org/):
- **Major** (X.0.0): Breaking changes
- **Minor** (0.X.0): New features, backward compatible
- **Patch** (0.0.X): Bug fixes, backward compatible

Current version: **2.0.0** (see [VERSION](VERSION) file)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

Proprietary - DrillBit Digital Twin System  
Copyright © 2026 All Rights Reserved

## 👥 Authors

- **Nayan Patel** - Lead Developer, Original Implementation
- **Chinnadurai** - System Architecture, Performance Optimization & Requirements

## 🙏 Acknowledgments

- Nayan Patel for the original DrillBit implementation
- Chinnadurai for system architecture and optimization requirements
- Drilling engineering team for domain expertise
- Operations team for performance requirements
- Testing team for validation and feedback

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/nayanpatel1986/DRIILBIT_TWIN/issues)
- **Documentation**: See `docs/` folder
- **Email**: support@drillbit.com

---

**Built with ❤️ for the drilling industry**
