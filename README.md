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
#### Install mockery
```bash
go install github.com/vektra/mockery/v2@v2.40.1
```

#### Generate mocks
```bash
mockery
```

#### Run tests
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
- [x] Webapp login redirect
- [ ] Env variables
- [ ] CICD to deploy on AWS
- [ ] Redis stream
- [ ] Paste API (Add, Read, Delete)
- [ ] Webapp use paste API
- [ ] Webapp store pastes local
- [ ] Webapp e2e encrypt and key sharing between clients
