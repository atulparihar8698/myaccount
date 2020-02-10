FROM mcr.microsoft.com/dotnet/core/aspnet:2.2
EXPOSE 8089
WORKDIR /app 
ENV ASPNETCORE_URLS http://*:6000
COPY ./publish .
ENTRYPOINT ["dotnet", "frontier.myAccount.web.dll"]
