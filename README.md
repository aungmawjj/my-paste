# My Paste

Quick copy and paste across your devices.

Sign in using same google account and you paste will be synced in real time.
Provide End-To-End encryption for data privacy.

## Develop
### Install go dependencies
```bash
go mod tidy
```

### Test
```bash
go test -v ./...
```

### Run
```bash
go run .
```

## Todo
- [x] Google sign in
- [x] Test setup
- [ ] Webapp login redirect
- [ ] Env variables
- [ ] CICD to deploy on AWS
- [ ] Redis stream
- [ ] Paste API (Add, Read, Delete)
- [ ] Webapp use paste API
- [ ] Webapp store pastes local
- [ ] Webapp e2e encrypt and key sharing between clients
