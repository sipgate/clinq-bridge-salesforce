# CLINQ CRM-Bridge Boilerplate Repository (TypeScript)

You can use this repository to bootstrap a new CLINQ CRM-Bridge.

If you want to implement your bridge in plain JavaScript, use [this](https://github.com/sipgate/clinq-crm-bridge-boilerplate) repository.

## Step by step guide

1. Clone this repository with a new name.
```bash
git clone git@github.com:sipgate/clinq-crm-bridge-boilerplate-typescript.git clinq-crm-bridge-mycrm
```
2. Run `rm -rf .git && git init` to initialize your new git repository.
3. Run `npm install` or `yarn` to install all dependencies.
4. Start the bridge with `npm start` or `yarn start`.
5. Edit the `index.ts` file and implement the method stubs.
6. Test your implementation (e.g. `curl -H "X-CRM-Key: abcdef123456" -H "X-CRM-URL: https://www.example.com" http://localhost:8080/contact`).
7. Make sure the Docker container is still working (`docker build -t clinq-crm-bridge . &&  docker run -p 8080:8080 clinq-crm-bridge`).
8. Create a new Git repository (e.g. `clinq-crm-bridge-salesforce`) and push your bridge.
9. [Contact](mailto:hello@clinq.com) us and tell us about your shiny new CLINQ-Bridge.
