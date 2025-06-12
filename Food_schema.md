Food{
description:	
Nutritional values of food

identifier	string
example: 53409478-105f-11e9-ab14-d663bd873d93
Main addressing, required field that identifies document in the collection.

The client should not create the identifier, the server automatically assigns it when the document is inserted.

The server calculates the identifier in such a way that duplicate records are automatically merged (deduplicating is made by date, device and eventType fields).

The best practise for all applications is not to loose identifiers from received documents, but save them carefully for other consumer applications/systems.

API v3 has a fallback mechanism in place, for documents without identifier field the identifier is set to internal _id, when reading or addressing these documents.

Note: this field is immutable by the client (it cannot be updated or patched)

date*	integer($int64)
example: 1525383610088
Required timestamp when the record or event occured, you can choose from three input formats

Unix epoch in milliseconds (1525383610088)
Unix epoch in seconds (1525383610)
ISO 8601 with optional timezone ('2018-05-03T21:40:10.088Z' or '2018-05-03T23:40:10.088+02:00')
The date is always stored in a normalized form - UTC with zero offset. If UTC offset was present, it is going to be set in the utcOffset field.

Note: this field is immutable by the client (it cannot be updated or patched)

utcOffset	[...]
app*	string
example: xdrip
Application or system in which the record was entered by human or device for the first time.

Note: this field is immutable by the client (it cannot be updated or patched)

device	string
example: dexcom G5
The device from which the data originated (including serial number of the device, if it is relevant and safe).

Note: this field is immutable by the client (it cannot be updated or patched)

_id	string
example: 58e9dfbc166d88cc18683aac
Internally assigned database id. This field is for internal server purposes only, clients communicate with API by using identifier field.

srvCreated	integer($int64)
example: 1525383610088
The server's timestamp of document insertion into the database (Unix epoch in ms). This field appears only for documents which were inserted by API v3.

Note: this field is immutable by the client (it cannot be updated or patched)

subject	string
example: uploader
Name of the security subject (within Nightscout scope) which has created the document. This field is automatically set by the server from the passed JWT.

Note: this field is immutable by the client (it cannot be updated or patched)

srvModified	integer($int64)
example: 1525383610088
The server's timestamp of the last document modification in the database (Unix epoch in ms). This field appears only for documents which were somehow modified by API v3 (inserted, updated or deleted).

Note: this field is immutable by the client (it cannot be updated or patched)

modifiedBy	string
example: admin
Name of the security subject (within Nightscout scope) which has patched or deleted the document for the last time. This field is automatically set by the server.

Note: this field is immutable by the client (it cannot be updated or patched)

isValid	boolean
example: false
A flag set by the server only for deleted documents. This field appears only within history operation and for documents which were deleted by API v3 (and they always have a false value)

Note: this field is immutable by the client (it cannot be updated or patched)

isReadOnly	boolean
example: true
A flag set by client that locks the document from any changes. Every document marked with isReadOnly=true is forever immutable and cannot even be deleted.

Any attempt to modify the read-only document will end with status 422 UNPROCESSABLE ENTITY.

food	string
food, quickpick

category	string
Name for a group of related records

subcategory	string
Name for a second level of groupping

name	string
Name of the food described

portion	number
Number of units (e.g. grams) of the whole portion described

unit	string
example: "g", "ml", "oz"
Unit for the portion

carbs	number
Amount of carbs in the portion in grams

fat	number
Amount of fat in the portion in grams

protein	number
Amount of proteins in the portion in grams

energy	number
Amount of energy in the portion in kJ

gi	number
Glycemic index (1=low, 2=medium, 3=high)

hideafteruse	boolean
Flag used for quickpick

hidden	boolean
Flag used for quickpick

position	number
Ordering field for quickpick

portions	number
component multiplier if defined inside quickpick compound

foods	[
Neighbour documents (from food collection) that together make a quickpick compound

{...}]
}