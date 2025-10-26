@echo off
echo ========================================
echo Video Generation Platform - Setup
echo ========================================
echo.

echo [1/5] Setting up backend...
cd backend

echo Creating .env file...
if not exist .env (
    copy .env.example .env
    echo .env created successfully
) else (
    echo .env already exists, skipping...
)

echo Installing backend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Backend npm install failed
    pause
    exit /b 1
)

echo Seeding database...
call npm run seed
if %errorlevel% neq 0 (
    echo ERROR: Database seed failed
    pause
    exit /b 1
)

cd ..

echo.
echo [2/5] Setting up frontend...
cd frontend

echo Creating .env.local file...
if not exist .env.local (
    copy .env.local.example .env.local
    echo .env.local created successfully
) else (
    echo .env.local already exists, skipping...
)

echo Installing frontend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Frontend npm install failed
    pause
    exit /b 1
)

cd ..

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To start the application:
echo.
echo Terminal 1 (Backend):
echo   cd backend
echo   npm run dev
echo.
echo Terminal 2 (Frontend):
echo   cd frontend
echo   npm run dev
echo.
echo Then open: http://localhost:3000
echo.
echo Demo accounts:
echo   FREE:    free@test.com / password123
echo   PREMIUM: premium@test.com / password123
echo.
pause
