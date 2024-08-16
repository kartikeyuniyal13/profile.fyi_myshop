/* eslint-disable camelcase */
import { Webhook } from "svix";
import { headers } from "next/headers";

import { createUser, deleteUser, updateUser } from "@/lib/actions/user.action";
import { NextResponse } from "next/server";

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.NEXT_CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new SVIX instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) ;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  const eventType = evt.type;
  console.log(eventType);

  //   Create User webhook
  if (eventType === "user.created") {
    // Create a user in the database
    const { id, email_addresses, image_url, username, first_name, last_name } =
      evt.data;

    const mongoUser = await createUser({
      clerkId: id,
      name: `${first_name}${last_name ? ` ${last_name}` : ""}`,
      username: username,
      email: email_addresses[0].email_address,
      cartId:"jdskf"
    });
    return NextResponse.json({ message: "OK", user: mongoUser });
  }

  //   Update User webhook


  //   Delete User webhook
  if (eventType === "user.deleted") {
    const { id } = evt.data;
    // Delete user from the database
    const deletedUser = await deleteUser({
      clerkId: id, // ----> id sometime may be null
    });
    return NextResponse.json({ message: "OK", user: deletedUser });
  }

  return new Response("", { status: 201 });
}
