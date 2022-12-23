const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const uuid = require("uuid").v4;

if (!fs.existsSync("./.data")) {
    fs.mkdirSync("./.data");
}

const databaseFile = "./.data/fender-assesment.db";
const databaseExists = fs.existsSync(databaseFile);
const databaseWrapper = require("sqlite");
const bcrypt = require("bcrypt");

let database;

databaseWrapper.open({
    filename: databaseFile,
    driver: sqlite3.Database
})
.then( async db => {
    database = db;

    try {
        if (!databaseExists) {
            await db.run(
                "CREATE TABLE `User` (`id` VARCHAR(36) NOT NULL PRIMARY KEY, " +
                "`name` VARCHAR(80) NULL, " +
                "`email` VARCHAR(180) NOT NULL, " +
                "`password` VARCHAR(80) NOT NULL," +
                "`temporaryPassword` TINYINT NOT NULL DEFAULT 0, " +
                "`profilePic` MEDIUMTEXT NULL)"
            );
            await db.run("CREATE INDEX fk_User_email_idx ON User (email ASC)");
            await db.run(
                "CREATE TABLE `Favorite` (`id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT," +
                " `idUser` VARCHAR(36) NOT NULL," +
                " `isPokemon` TINYINT NOT NULL DEFAULT 0," +
                " `idFavorite` INTEGER NOT NULL," +
                " CONSTRAINT `fk_Favorite_User`" +
                "   FOREIGN KEY (`idUser`)" +
                "   REFERENCES `User` (`id`)" +
                "   ON DELETE NO ACTION" +
                "   ON UPDATE NO ACTION)"
            );
            await db.run("CREATE INDEX fk_Favorite_User_idx ON Favorite (idUser ASC)");
        }
    } catch (error) {
        console.error(error);
    }
});

module.exports = {
    createUser: async (email, password, name="", isTemporaryPassword=false) => {
        const foundUser = await module.exports.findUser(email);
        if (foundUser.length > 0) {
            console.log("User already exists.");
            return { error: "Email already in use." };
        }
        const hashedPassword = await bcrypt.hash(password, 8);
        return await database.run("INSERT INTO `User` (id,email,password,name,temporaryPassword) VALUES (?, ?, ?, ?, ?)", [
            uuid(), email, hashedPassword, name, isTemporaryPassword
        ]);
    },
    findUser: async (email) => {
        return await database.all("SELECT id,name,email FROM User WHERE email = ?", email);
    },
    updateUser: async (id,name) => {
        return await database.run("UPDATE User SET name = ? WHERE id = ?", [
            name, id
        ]);
    },
    setPassword: async (id,password) => {
        const hashedPassword = await bcrypt.hash(password, 8);
        return await database.run("UPDATE User SET password = ?, temporaryPassword = FALSE WHERE id = ?", [
            hashedPassword, id
        ]);
    },
    updateUserProfilePic: async (id,profilePicBase64) => {

    },
    deleteUser: async (id) => {
        return await database.run("DELETE FROM User WHERE id = ?", id);
    },
    getUsers: async () => {
        return await database.all("SELECT id, email, name FROM User ORDER BY email ASC;");
    },
    userLogin: async (email, password) => {
        let foundUsers = await database.all("SELECT id, email, name, password, temporaryPassword FROM `User` WHERE email = ?", email);
        for (let i = 0; i < foundUsers.length; i++) {
            if (await bcrypt.compare(password,foundUsers[i].password)) {
                return {
                    id: foundUsers[i].id,
                    name: foundUsers[i].name,
                    email: foundUsers[i].email,
                    temporaryPassword: foundUsers[i].temporaryPassword
                }
            }
        }
        return false;
    },
    userProfile: async (id) => {
        let profile = await database.get("SELECT id, email, name, profilePic FROM `User` WHERE id = ?",id);
        let pokemonFavs = await database.all("SELECT id, idUser, isPokemon, idFavorite FROM Favorite WHERE idUser = ? AND isPokemon = TRUE", id);
        let rickyFavs = await database.all("SELECT id, idUser, isPokemon, idFavorite FROM Favorite WHERE idUser = ? AND isPokemon = FALSE", id);
        return { profile, pokemonFavs, rickyFavs };
    },
    favoriteRickAndMorty: async(idUser, idFavorite) => {
        return await database.run("INSERT INTO Favorite (idUser,idFavorite,isPokemon) VALUES (?,?,FALSE)", [
            idUser, idFavorite
        ]);
    },
    unfavoriteRickAndMorty: async(idUser,idFavorite) => {
        return await database.run("DELETE FROM Favorite WHERE idUser = ? AND idFavorite = ? AND isPokemon = FALSE", [
            idUser, idFavorite
        ]);
    },
    favoritePokemon: async(idUser, idFavorite) => {
        return await database.run("INSERT INTO Favorite (idUser,idFavorite,isPokemon) VALUES (?,?,TRUE)", [
            idUser, idFavorite
        ]);
    },
    unfavoritePokemon: async(idUser,idFavorite) => {
        return await database.run("DELETE FROM Favorite WHERE idUser = ? AND idFavorite = ? AND isPokemon = TRUE", [
            idUser, idFavorite
        ]);
    }
}