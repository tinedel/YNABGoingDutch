class AbnMapper extends BankMapper {
    constructor(bankMap, map) {
        super(bankMap, map)
    }

    payee; 
    memo;


    /**
     * Get the payee of the current line
     * @return {string} The payee.
     */
    getPayee = () => payee || "";

    /**
     * Get the memo of the current line
     * @return {string} The Memo.
     */
    getMemo = () => memo || "";


    /**
     * Has to be called to parse a new line.
     * @param line {string}
     */
    preProcessLine = (line) => {
        const clearInfo = () => {
            this.payee = this.memo = "";
        };

        const parseTrashField = function (field) {
            const findSlashField = (matches, name) => {
                for (let i = 0; i < matches.length; i++) {
                    if (matches[i][0].includes(name) && i + 1 < matches.length) {
                        return matches[i + 1][1];
                    }
                }

                return "";
            };

            try {
                if (field.startsWith("BEA") || field.startsWith("GEA")) {
                    // BEA/GEA Pinpas payment
                    try {
                        const regex = /(?:\/\d+\.\d+\s)(.+?)(?:,PAS)/g;
                        const match = regex.exec(field)// Only obtains name
                        this.payee = match[1];
                    } catch (e) {
                        console.log("Error parsing payee: " + e);

                        const fallbackRegex = /(?:\s{2,})(.+?)(?:,PAS)/g;
                        const fallbackMatch = fallbackRegex.exec(field);
                        this.payee = fallbackMatch[1];
                    }

                } else if (field.startsWith("/")) {
                    // TRTP
                    const match = Array.from(field.matchAll(/(?:\/?)(.*?)(?:\/|\s+$)/g));
                    this.payee = findSlashField(match, "NAME") + ' ' + findSlashField(match, "IBAN");
                    this.memo = findSlashField(match, "REMI") + "\t" + findSlashField(match, "CSID") || findSlashField(match, "IBAN");
                } else if (field.startsWith("ABN")) {
                    // Payment from/to ABN Bank
                    const match = Array.from(field.matchAll(/(.+?)(?:\s{2,}|$)/g));
                    //    0 is name, 1 is description
                    if (match.length >= 3) {
                        this.payee = match[0][1];
                        this.memo = match[1][1];
                    }
                } else if (field.startsWith("STORTING BELEG. FONDS ")) {
                    // Extract details of "Beleggen" order
                    const match = Array.from(field.matchAll(/(.+?)(?:\s{2,}|$|\sFONDSCODE)/g));
                    //    0 is name of fund, 3 is order details
                    if (match.length >= 4) {
                        this.payee = match[0][1].substring(22);
                        this.memo = match[3][1];
                    }
                } else if (field.startsWith("SEPA")) {
                    // SEPA overboeking
                    let iban = ""
                    let name = ""

                    const match = Array.from(field.matchAll(/(?:SEPA Overboeking\s+?)*(.+?):(.+?)(?:\s{2,}|$)/gm));
                    for (const m of match) {
                        if (m[1].includes("IBAN")) {
                            // IBAN
                            iban = m[2]
                        } else if (m[1].includes("Naam")) {
                            // Naam
                            name = m[2]
                        } else if (m[1].includes("Omschrijving")) {
                            // Omschrijving
                            memo = m[2]
                        }
                    }

                    this.payee = name
                    if (iban !== "")
                        this.payee += " " + iban
                } else if (field.startsWith("KOOP")) {
                    // Buy assets
                    this.payee = "ABN AMRO"
                    this.memo = field
                } else {
                    console.warn("Field not recognized " + field)
                }
            } catch (e) {
                console.warn("Error parsing trash field: " + e);
            }
        };

        clearInfo();
        parseTrashField(line[7]);
    }
}