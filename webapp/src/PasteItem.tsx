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
import { useCallback } from "react";
import useStreamEvents from "./useStreamEvents";

type Props = {
  paste: StreamEvent;
};

function PasteItem({ paste }: Readonly<Props>) {
  const { onCopy, hasCopied } = useClipboard(paste.Payload);
  const { deleteStreamEvents } = useStreamEvents();

  const onDelete = useCallback(() => {
    deleteStreamEvents(paste.Id)
      .then(() => {
        console.log("deleted paste, id:", paste.Id);
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

      <Text pt={2} fontSize="sm">
        {paste.Payload}
      </Text>

      <Flex position="absolute" top={1} right={4} gap={2}>
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
