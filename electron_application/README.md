# APPLICATION SETUP

## Backend Setup

### Navigate to backend folder
```
cd backend
```
### Create virtual environment
```
python -m venv venv
```
### Activate virtual environment

#### On Mac/Linux:
```
source venv/bin/activate
```
#### On Windows:
```
venv\Scripts\activate
```
### Make sure Poetry is installed 

#### If its not installed then install it with:

```
pip install poetry
```

### Install dependencies from pyproject.toml
```
poetry install
```

## Frontend Setup
### Navigate to frontend folder
```
cd electron-app
```

### Install dependencies
```
npm install
```

## Running The Application
#### Make sure to have 2 Terminals running at same time

### Terminal 1 : Start Backend(keep this terminal running)
```
cd backend
```
### Activate virtual environment

#### Mac/Linux:
```
source venv/bin/activate
```

#### Windows:
```
venv\Scripts\activate
```

### Start server
```
poetry run uvicorn app.main:app --reload --port 8000
```
### Terminal 2: Start Frontend
```
cd electron-app
```
#### Start Electron app
```
npm run electron:dev
```