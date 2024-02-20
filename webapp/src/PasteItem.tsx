import {
  Box,
  Flex,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useClipboard,
} from "@chakra-ui/react";
import { MdContentCopy, MdDelete, MdMoreVert } from "react-icons/md";
import { StreamEvent } from "./model";
import { BsClipboardCheck } from "react-icons/bs";
import { useCallback, useState } from "react";
import useStreamEvents from "./useStreamEvents";
import { FaEye, FaEyeSlash } from "react-icons/fa";

type Props = {
  paste: StreamEvent;
};

const foldAt = 300;

function PasteItem({ paste }: Readonly<Props>) {
  const { onCopy, hasCopied } = useClipboard(paste.Payload);
  const { deleteStreamEvents } = useStreamEvents();
  const [folded, setFolded] = useState(true);
  const [hidden, setHidden] = useState(true);

  const foldable = paste.Payload.length > foldAt;
  let payloadText = paste.Payload;
  if (foldable && folded) payloadText = paste.Payload.slice(0, foldAt) + " ...";
  if (paste.IsSensitive && hidden) payloadText = "* * * * *";

  const onDelete = useCallback(() => {
    deleteStreamEvents(paste.Id)
      .then(() => {
        console.debug("deleted paste, id:", paste.Id);
      })
      .catch(console.warn);
  }, [deleteStreamEvents, paste]);

  return (
    <Box
      position="relative"
      py={6}
      px={8}
      my={3}
      borderRadius="24px"
      bg="white"
      _dark={{
        bg: "gray.800",
      }}
    >
      <Text fontSize="xs" color="gray.500" _dark={{ color: "gray.400" }}>
        {timeText(paste)}
      </Text>

      <Box
        _hover={{ cursor: "pointer" }}
        onClick={() => setFolded((prev) => !prev)}
      >
        <Text pt={2} fontSize="md" fontWeight="thin" whiteSpace="pre-wrap">
          {payloadText}
        </Text>

        {foldable && (
          <Text fontSize="sm" color="gray.500" _dark={{ color: "gray.400" }}>
            {folded ? "show more" : "show less"}
          </Text>
        )}
      </Box>

      <Flex position="absolute" top={1} right={4} gap={2}>
        {paste.IsSensitive && (
          <IconButton
            size="md"
            aria-label="hide / show"
            variant="ghost"
            colorScheme="brand"
            onClick={() => setHidden((prev) => !prev)}
            icon={
              <Icon as={hidden ? FaEyeSlash : FaEye} boxSize={6} />
            }
          />
        )}
        <IconButton
          size="md"
          aria-label="copy"
          variant="ghost"
          colorScheme={hasCopied ? "green" : "brand"}
          onClick={onCopy}
          icon={
            <Icon
              as={hasCopied ? BsClipboardCheck : MdContentCopy}
              boxSize={6}
            />
          }
        />
        <Menu>
          <MenuButton
            as={IconButton}
            size="md"
            aria-label="Options"
            variant="ghost"
            colorScheme="brand"
            icon={<Icon as={MdMoreVert} boxSize={6} />}
          />
          <MenuList>
            <MenuItem
              onClick={onDelete}
              icon={<Icon as={MdDelete} boxSize={6} />}
            >
              Delete
            </MenuItem>
          </MenuList>
        </Menu>
      </Flex>
    </Box>
  );
}

function timeText(paste: StreamEvent): string {
  const now = new Date();
  const date = new Date(paste.Timestamp * 1000);
  const minutesAgo = Math.floor((now.getTime() - date.getTime()) / 60000);
  const hoursAgo = Math.floor(minutesAgo / 60);
  const daysAgo = Math.floor(hoursAgo / 24);
  if (minutesAgo < 1) return "just now";
  if (hoursAgo < 1) return `${minutesAgo} min${minutesAgo > 1 ? "s" : ""} ago`;
  if (daysAgo < 1) return `${hoursAgo} hour${hoursAgo > 1 ? "s" : ""} ago`;
  if (daysAgo < 10) return `${daysAgo} day${daysAgo > 1 ? "s" : ""} ago`;
  return date.toDateString();
}

export default PasteItem;
