@echo off
title Installing Backend Dependencies (Simple)
echo =============================================
echo Energy Defense Platform - Simple Backend Setup
echo =============================================

echo Activating conda environment...
call conda activate energy_defense

echo Installing pre-compiled packages...
python -m pip install --upgrade pip
pip install --only-binary=all numpy==1.24.3
pip install --only-binary=all pandas==2.0.3
pip install Flask==2.3.3
pip install Flask-CORS==4.0.0
pip install scikit-learn==1.3.0
pip install networkx==3.1
pip install matplotlib==3.7.2

echo.
echo Installation completed!
echo Press any key to exit...
pause >nul