
# Flexso-cf-debugenv
Automate the configuration of a local development environment to test ePaas applications deployed on SAP BTP Cloud Foundry
This is a CLI that will put the default-services and default-env files in place.
before you use this cli you have to logon to cloud foundry.

    cf login --sso

## step 1: init
before you can generate the default-*.json files for your project you have to do some configuration. 

    setdebugenv --init

This command will guide you through the setup.
If there is no settings file yet for this library it will be created, therefore select the folders where you want to put the output in.

if the settings file is created. We can start linking provider tenants. 
A provider tenant can be found just by entering the name of the app in cloud foundry.
Select the provider tenant you want to add.
For each service linked to this app a debug key is created, to prevent it from changing on each deployment. The configuration file for the provider tenant is 

if you want to link an additional provider account, rerun 

    setdebugenv --init

## step 2: generate default-*.json files
now we want to set the correct default-*.json files for a selected consumer tenant.

    setdebugenv

First, select the provider account configuration.
A list of all subscribed tenants is shown, select the correct consumer tenant.
The default-*.json files are placed in the directories configured in the initialisation and stored in the settings.json file.

Enjoy debugging!
