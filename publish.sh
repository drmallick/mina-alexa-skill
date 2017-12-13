rm index.zip 
cd lambda 
echo $PWD
zip –r /Users/haseeb/Desktop/mina-alexa-skill/index.zip *
cd ..
aws lambda update-function-code --function-name minaSkill --zip-file fileb://index.zip
