/* eslint-disable @typescript-eslint/no-explicit-any */
import sizeOf from "buffer-image-size";
import axios, { AxiosError, AxiosResponse } from "axios";
import FormData from "form-data";
import { Client } from "./Client";
import { InteractionOptions } from "./InteractionOptions";
import { Message } from "./Message";
import { User } from "./User";
import {
    MessageActionRow,
    MessageComponentData,
} from "./classes/MessageActionRow";
import { MessageAttachment } from "./classes/MessageAttachment";
import { MessageEmbed, MessageEmbedData } from "./classes/MessageEmbed";
import { TextInput } from "./classes/Modal";
import fastify, { FastifyReply } from "fastify";
import { Shard } from "./sharding/Shard";

declare global {
    namespace NodeJS {
        interface Process {
            lastApiLatency: number;
        }
    }
}

export class Interaction {
    data: InteractionData;
    res: FastifyReply;
    message: Message;
    options: InteractionOptions;
    client: Client;
    user: User;
    channel: TextChannel;
    deffered: boolean = false;
    createdTimestamp: number;
    replied: boolean = false;
    values?: string[];
    url = `https://discord.com/api/v9`;

    /**
     * Constructs a new instance of the Interaction class.
     * @constructor
     * @param interactionData - The interaction data.
     * @param res - The Fastify reply object.
     * @param client - The client object.
     */
    constructor(
        interactionData: InteractionData,
        res: FastifyReply,
        client: Client
    ) {
        this.data = interactionData; // @ts-ignore
        //if (process.flags.state('debug')) this.data.data = {};
        this.res = res;
        this.createdTimestamp = Date.now();
        this.options = new InteractionOptions(this.data.data, this);
        this.client = client;
        this.channel = new TextChannel(this);
        if (!this.data.member) {
            console.warn(
                `[Interaction] member is null -> ${this.data.id} -> command: ${this.data?.data?.name || this.data?.data?.custom_id
                }`
            );
            // @ts-expect-error
            this.data.member = {};
        }
        this.user = new User(this.data.member.user);
        this.client.cache.addUser(this.user);
        if (!this.isCommand()) {
            //@ts-ignore
            this.message = new Message(this.data.message, this);
        }

        if (this.isSelectMenu()) {
            // @ts-ignore
            this.values = this.data.data.values;
        }
    }

    /**
     * Gets the guild ID associated with this interaction.
     * 
     * @returns {string} The guild ID.
     */
    get guild() {
        // @ts-ignore
        //if (process.flags.state('debug')) return this.data.guildId;
        return this.data.guild_id;
    }


    /**
     * Gets the name of the command.
     * @returns {string} The name of the command.
     */
    get commandName() {
        // @ts-ignore
        //if (process.flags.state('debug')) return this.data.commandName;
        return this.data?.data?.name;
    }

    /**
     * Gets the custom ID of the interaction.
     *
     * @return {string} The custom ID of the interaction, or undefined if it is not available.
     */
    get customId() {
        return this.data?.data?.custom_id;
    }

    // This is used for backend tampering to allow redirection of button commands to the command handler
    /**
     * Sets the name of the command.
     * 
     * @param name - The name of the command.
     */
    set commandName(name: string) {
        this.data.data.name = name;
    }

    /**
     * Sets the custom ID for the interaction.
     * 
     * @param id - The custom ID to set.
     */
    set customId(id: string) {
        this.data.data.custom_id = id;
    }

    /**
     * Checks if the interaction is a command.
     * @returns {boolean} Returns true if the interaction is a command, otherwise false.
     */
    public isCommand(): boolean {
        // @ts-ignore
        //if (process.flags.state('debug')) return this.data.isCommand();
        return this.data.type == 2;
    }

    /**
     * Checks if the interaction is a button.
     * @returns {boolean} Returns true if the interaction is a button, otherwise false.
     */
    public isButton(): boolean {
        // @ts-ignore
        //if (process.flags.state('debug')) return this.data.isButton();
        return this.data.type == 3 && this.data.data.component_type == 2;
    }

    /**
     * Checks if the interaction is a modal submit.
     * @returns {boolean} Returns true if the interaction is a modal submit, otherwise false.
     */
    public isModalSubmit(): boolean {
        // @ts-ignore
        //if (process.flags.state('debug')) return this.data.isModalSubmit();
        return this.data.type == 5;
    }

    /**
     * Checks if the interaction is a select menu.
     * @returns {boolean} True if the interaction is a select menu, false otherwise.
     */
    public isSelectMenu(): boolean {
        // @ts-ignore
        //if (process.flags.state('debug')) return this.data.isSelectMenu();
        return (
            this.data.type == 3 &&
            [
                3 /* String */, 5 /* User */, 6 /* Role */, 7 /* Mentionable */,
                8 /* Channel */,
            ].includes(this.data.data.component_type)
        );
    }

    /**
     * Sends an HTTP request to the specified URL.
     * 
     * @param url - The URL to send the request to.
     * @param type - The type of the request (default: "get").
     * @param body - The body of the request (optional).
     * @returns A promise that resolves with the response from the server.
     */
    async iwr(url: string, type: string = "get", body?: any) {
        if (!body) return Interaction.iwr(url, this.client, type);
        else return Interaction.iwr(url, this.client, type, body);
    }

    /**
     * Sends an HTTP request to the specified URL using Axios.
     * 
     * @param {string} url - The URL to send the request to.
     * @param {Client | Shard} client - The client object used for authorization.
     * @param {string} type - The type of HTTP request (e.g., "get", "post").
     * @param body - The request body (optional).
     * @returns {Promise<AxiosResponse<any, any>>} A Promise that resolves to the AxiosResponse object.
     */
    static async iwr(url: string, client: Client | Shard, type?: string, body?: any) {
        let req: AxiosResponse<any>;
        let tokenRegex = /\/webhooks\/\d+\/[a-zA-Z0-9_-]+/;

        // Measure API Latency
        let instance = axios.create();
        instance.interceptors.request.use((config: { headers: { [x: string]: any; }; }) => {
            config.headers["request-startTime"] = process.hrtime();
            return config;
        });
        instance.interceptors.response.use((response: { config: { headers: { [x: string]: any; }; }; headers: { [x: string]: number; }; }) => {
            const start = response.config.headers["request-startTime"];
            const end = process.hrtime(start);
            const milliseconds = Math.round(end[0] * 1000 + end[1] / 1e6);
            response.headers["X-Response-Time"] = milliseconds;
            return response;
        });

        try {
            // IWebRequest to Discord API (Axios)
            if (type == "get") {
                req = await instance.get(url, {
                    headers: { Authorization: `Bot ${client.token}` },
                });
            } else {
                req = await instance[type || "get"](url, body ?? null, {
                    headers: { Authorization: `Bot ${client.token}` },
                });
            }
        } catch (error: any) {
            // Handle Specific Errors

            switch (error.response?.status) {
                case 403:
                    // Forbidden (99.9% DMs disabled)
                    break;

                default:
                    // Log Error
                    console.error(
                        `[IWR ERROR]`.red +
                        `${error.response?.data?.message} -> ERRNO ${error.response?.status
                        }/${error.response?.data?.code ?? 0}`
                    );
                    if (error.response?.data)
                        console.log(
                            JSON.stringify(error.response.data, null, 2)
                        );
                    if (!error.response?.data?.message) console.error(error);
                    console.info(
                        `Request URL: ${url.replace(tokenRegex, "/webhooks/<token>").magenta
                        }`
                    );
                    break;
            }
        }
        process.lastApiLatency = req.headers["X-Response-Time"];
        if (req?.headers?.["X-RateLimit-Remaining"])
            console.log(
                `[IWR] ${req.headers["X-RateLimit-Remaining"]}/${req.headers["X-RateLimit-Limit"]} requests remaining`
            );
        return req;
    }

    /**
     * Displays a modal dialog for interaction.
     * 
     * @param {TextInput} data - The text input data for the modal dialog.
     * @returns A promise that resolves when the modal dialog is closed.
     */
    async showModal(data: TextInput) {
        await this.iwr(
            `${this.url}/interactions/${this.data.id}/${this.data.token}/callback`,
            "post",
            {
                type: 0x9, //0x9 type -> APPLICATION_MODAL,
                data,
            }
        );
    }

    /**
     * Fetches the reply message for the interaction.
     * 
     * @returns The data of the fetched reply message, or null if there was an error.
     */
    async fetchReply() {
        try {
            let req = await this.iwr(
                `${this.url}/webhooks/${this.client.user.id}/${this.data.token}/messages/@original`,
                "get"
            );

            try {
                if (!req?.data) {
                    console.warn(
                        `fetchReply response is empty -> ${this.commandName.magenta} | [/webhooks/] -> nullPtr`
                    );
                    return null;
                }
                this.message = new Message(req.data, this);
                req.data.client = this.client;
                return req.data;
            } catch (error) {
                console.error(
                    `Error in Interaction.fetchReply [PARSER] -> ${(error as AxiosError).message
                    }\n ${error}`
                );
                console.warn(`HTTP ${req?.status} -> ${req?.data}`);
                return null;
            }
        } catch (error) {
            console.error(
                `Error in Interaction.fetchReply: ${(error as AxiosError)?.code
                }\n ${error}`
            );
            return null;
        }
    }

    /**
     * Sends a reply to the interaction.
     * 
     * @param {InteractionReplyData} data - The data for the reply.
     * @param {boolean} replied - Optional flag indicating if the interaction has already been replied to.
     * @returns {Promise<Message>} A Promise that resolves to the sent message.
     */
    async reply(data: InteractionReplyData, replied = false): Promise<Message> {
        if (data.ephemeral) data.flags = 64;

        if (this.replied) {
            console.warn(
                `${"[REGRESSION]".red} ${"[WARN]".yellow
                } Interaction already replied. Falling back to editReply() -> ${this.commandName?.magenta
                }`
            );
            await this.editReply(data);
            if (data.fetchReply) return await this.fetchReply();
            return;
        }
        this.replied = true;

        if (data.files) {
            // Send Images using multipart/form-data
            await Promise.resolve(
                await this.iwrFormData(
                    data,
                    `${this.url}/webhooks/${this.client.user.id}/${this.data.token}/messages/@original`,
                    replied
                )
            );
        } else {
            await Promise.resolve(
                this.res.send({
                    type: 0x4, // 0x4 type -> CHANNEL_MESSAGE_WITH_SOURCE
                    data: Interaction.parseMessage(data),
                })
            );
        }

        if (data.fetchReply) return await this.fetchReply();
    }

    /**
     * Edits the reply of the interaction.
     * @param {InteractionReplyData} data - The data to be edited.
     * @returns  A Promise that resolves when the reply is edited.
     */
    async editReply(data: InteractionReplyData) {
        if (data.ephemeral) data.flags = 64;

        try {
            if (data.files)
                return this.iwrFormData(
                    data,
                    `${this.url}/webhooks/${this.client.user.id}/${this.data.token}/messages/@original`,
                    true
                );
            await this.iwr(
                `${this.url}/webhooks/${this.client.user.id}/${this.data.token}/messages/@original`,
                "patch",
                data
            );
        } catch (error) {
            console.log((error as AxiosError).response.data);
        }
        if (data.fetchReply) return await this.fetchReply();
    }

    /**
     * Deletes the reply message.
     * 
     * @returns A promise that resolves when the reply message is successfully deleted.
     */
    async deleteReply() {
        await this.iwr(
            `${this.url}/webhooks/${this.client.user.id}/${this.data.token}/messages/@original`,
            "delete"
        );
    }

    /**
     * Updates the interaction with the provided data.
     * 
     * @param {InteractionReplyData} data - The data to update the interaction with.
     * @returns void
     */
    async update(data: InteractionReplyData) {
        this.res.send({
            type: 0x7, // 0x7 type -> UPDATE_MESSAGE
            data: Interaction.parseMessage(data),
        });
    }

    /**
     * Sends a follow-up message in response to an interaction.
     * @param {InteractionReplyData} data - The data for the follow-up message.
     * @returns A Promise that resolves to the fetched reply, or null if `fetchReply` is false.
     */
    async followUp(data: InteractionReplyData) {
        if (data.ephemeral) data.flags = 64;
        await this.iwr(
            `${this.url}/webhooks/${this.client.user.id}/${this.data.token}`,
            "post",
            Interaction.parseMessage(data)
        );
        if (data.fetchReply) return await this.fetchReply();
        else return null;
    }

    /**
     * Defers the interaction response.
     * 
     * This method sends a deferred response to the interaction, indicating that the bot is still processing the request.
     * 
     * It sets the `type` property of the response to `0x5` (DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE).
     * 
     * It also sets the `deffered` property of the class instance to `true`.
     */
    async defer() {
        this.res.send({
            type: 0x5, // 0x5 type -> DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
        });
        this.deffered = true;
    }

    /**
     * Defers the update message.
     * 
     * Sends a deferred update message to the client.
     * 
     * It sets the `type` property of the response to `0x6` (DEFERRED_UPDATE_MESSAGE).
     * 
     * Sets the `deffered` flag to true.
     */
    async deferUpdate() {
        this.res.send({
            type: 0x6, // 0x6 type -> DEFERRED_UPDATE_MESSAGE
        });
        this.deffered = true;
    }

    /**
     * Suspends the execution of the current function for the specified number of milliseconds.
     * @param {number} ms - The number of milliseconds to sleep.
     * @returns A promise that resolves after the specified number of milliseconds.
     */
    sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Parses the given `msg` object and returns a formatted `InteractionReplyFormatted` object.
     * This function extracts embeds, components, and attachments from the `msg` object and formats them accordingly.
     * 
     * @param {InteractionReplyData} msg - The `InteractionReplyData` object to be parsed.
     * @returns {InteractionReplyFormatted} The formatted `InteractionReplyFormatted` object.
     */
    static parseMessage(msg: InteractionReplyData): InteractionReplyFormatted {
        let data: InteractionReplyFormatted = {} as InteractionReplyFormatted;
        // Parse embeds, components and attachments

        //fallback
        if(typeof msg === 'string') {
            return { content: msg };
        }

        for (let i in msg) {
            if (i === "embeds" || i === "components" || i === "attachments") {
                data[i] = [];

                if (msg[i].length > 0 && msg[i][0] == undefined) continue;

                for (let e of msg[i]) {
                    if (i === "embeds")
                        data.embeds.push(Interaction.parseEmbed(e));
                    if (i === "components") data.components.push(e.toJSON());
                    //if(i === 'attachments') data.attachments.push(e.toJSON());
                }
            } else data[i] = msg[i];
        }

        return data;
    }

    /**
     * Sends a form data request with interaction reply data to the specified URL.
     * 
     * @param {InteractionReplyData} body - The interaction reply data.
     * @param {string} url - The URL to send the request to.
     * @param {boolean} alreadyReplied - Optional parameter indicating if the reply has already been sent. Default is false.
     * @returns A promise that resolves to the response from the server.
     */
    public async iwrFormData(
        body: InteractionReplyData,
        url: string,
        alreadyReplied = false
    ) {
        let form = new FormData();

        let j = 0;

        // @ts-ignore
        body.attachments = [];

        for (let i in body.files) {
            let file = body.files[i];

            let size = sizeOf(file.attachment);

            // @ts-ignore
            body.attachments.push({
                name: file.name,
                id: j,
                size: Buffer.byteLength(file.attachment),
                content_type: "image/png",
                height: size.height,
                width: size.width,
            });

            j++;
        }

        // @ts-ignore
        if (process.flags.state("debug"))
            // @ts-ignore
            console.debug({ attachments: body.attachments, form });

        form.append("payload_json", JSON.stringify(body));

        let isIterable = (obj: any) => {
            if (obj == null) return false;
            return typeof obj[Symbol.iterator] === "function";
        };

        if (!isIterable(body.files)) body.files = [];

        let i = 0;
        for (let file of body.files) {
            form.append(`files[${i}]`, file.attachment, {
                filename: file.name.replace("\r\n", "").replace("\n", ""),
                contentType: "image/png",
            });
            i++;
        }

        if (!alreadyReplied) await this.deferUpdate();

        let startedTimestamp = Date.now();
        let req: any;
        try {
            req = await axios({
                method: "patch",
                url: url,
                data: form,
                headers: {
                    "Content-Type": `multipart/form-data; boundary=${form.getBoundary()}`,
                },
            });
        } catch (error) {
            console.error(`[Axios IWR^FD] Error while uploading image`);
            console.log(error);
            if ((error as AxiosError)?.response?.data) {
                // @ts-ignore
                if ((error as AxiosError).response.data.code !== 10015)
                    // Unknown Webhook
                    console.log(
                        JSON.stringify(
                            (error as AxiosError)?.response?.data,
                            null,
                            2
                        )
                    );
            }
        }

        let endTimestamp = Date.now();

        process.lastApiLatency = endTimestamp - startedTimestamp;
        return req;
    }

    private avatarURL() {
        return `https://cdn.discordapp.com/avatars/${this.user.id}/${this.user.avatar}.png`;
    }

    /**
     * Parses a MessageEmbed object and returns its JSON representation.
     * 
     * @param {MessageEmbed} embed - The MessageEmbed object to parse.
     * @returns {MessageEmbedData} The JSON representation of the embed.
     */
    static parseEmbed(embed: MessageEmbed): MessageEmbedData {
        let data = embed.toJSON();
        return data;
    }
}

/**
 * Represents a text channel in a Discord interaction.
 */
export class TextChannel {
    interaction: Interaction;
    id: string;

    constructor(parent: Interaction) {
        this.interaction = parent;
        this.id = parent.data.channel_id;
    }

    /**
     * Sets the channel ID.
     * 
     * @param {string} id - The ID of the channel.
     */
    set channel_id(id: string) {
        this.id = id;
    }

    /**
     * Sends a message to the specified channel.
     * 
     * @param {InteractionReplyData} data - The data for the message to be sent.
     * @returns {Promise<Message>} A Promise that resolves to the sent message.
     */
    async send(data: InteractionReplyData) {
        let res = await this.interaction.iwr(
            `https://discord.com/api/v9/channels/${this.id}/messages`,
            "post",
            Interaction.parseMessage(data)
        );

        if (!res?.data)
            console.warn(
                `[TextChannel::send] HTTP 403 Forbidden -> POST /channels/${this.id}/messages`
            );
        if (!res) {
            console.warn("NO Response from TextChannel.send()");
            console.log({ data });
            return null;
        }

        return new Message(res.data, this.interaction);
    }
}

/**
 * Represents the data structure for an interaction.
 */
export interface InteractionData {
    id: string; // Unique ID of command
    type?: number;
    application_id: string;
    guild_id?: string;
    channel_id?: string;
    locale: string;
    options?: InteractionAutocompleteOption[];
    data: {
        guild_id: string;
        name: string;
        id: string;
        options?: InteractionOption[];
        type: number;
        component_type?: number;
        custom_id?: string;
    };
    default_member_permissions?: string[];
    dm_permission?: boolean;
    default_permission?: boolean;
    version: string;
    token: string;
    member: {
        avatar: string;
        deaf: boolean;
        flags: number;
        is_pending: boolean;
        joined_at: string;
        mute: boolean;
        nick: string;
        pending: boolean;
        permissions: string;
        roles: string[];
        user: {
            avatar: string;
            discriminator: string;
            id: string;
            public_flags: number;
            username: string;
            tag: string;
        };
    };
    components?: {
        type: number;
        custom_id: string;
        style: number;
        label: string;
        emoji: {
            id: string;
            name: string;
            animated: boolean;
        };
        url: string;
        disabled: boolean;
        components?: {
            type: number;
            custom_id: string;
            value: string;
            style: number;
            label: string;
            emoji: {
                id: string;
                name: string;
                animated: boolean;
            };
            url: string;
            disabled: boolean;
        }[];
    }[];
}

/**
 * Represents an interaction option.
 * @interface
 */
declare interface InteractionOption {
    type: number;
    name: string;
    description: string;
    required: boolean;
    choices: InteractionOptionChoice[];
    options: InteractionOption[];
    channel_types: number[];
    min_value?: number;
    max_value?: number;
    min_length?: number;
    autocomplete?: boolean;
    // Types for autocomplete interactiontype
    focused?: boolean;
    value?: string;
}

/**
 * Represents an autocomplete option for an interaction.
 */
declare interface InteractionAutocompleteOption {
    focused: boolean;
    name: string;
    type: number;
    value: string;
}

/**
 * Represents an option choice for an interaction.
 */
declare interface InteractionOptionChoice {
    name: string;
    value: string | number;
}

/**
 * Represents the data for an interaction reply.
 */
export interface InteractionReplyData {
    ephemeral?: boolean;
    flags?: number;
    content?: string;
    fetchReply?: boolean;
    embeds?: MessageEmbed[];
    components?: MessageActionRow<any>[];
    files?: MessageAttachment[];
}

/**
 * Represents the formatted reply for an interaction.
 */
declare interface InteractionReplyFormatted {
    ephemeral?: boolean;
    flags?: number;
    content?: string;
    fetchReply?: boolean;
    embeds?: MessageEmbedData[];
    components?: MessageComponentData[];
    attachments?: any[];
}
