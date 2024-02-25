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
import { StreamEvent } from "../model/types";
import { BsClipboardCheck } from "react-icons/bs";
import { useCallback, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { formatPastTime } from "../model/formatter";
import { useStreamState } from "../state/stream";

type Props = {
  paste: StreamEvent;
};

const foldAt = 300;

function PasteItem({ paste }: Readonly<Props>) {
  const { onCopy, hasCopied } = useClipboard(paste.Payload);
  const { deleteStreamEvents } = useStreamState();
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
        {formatPastTime(new Date(paste.Timestamp * 1000))}
      </Text>

      <Box
        _hover={{ cursor: "pointer" }}
        onClick={() => setFolded((prev) => !prev)}
        fontSize="md"
        fontWeight="300"
        whiteSpace="pre-wrap"
        letterSpacing="0.05em"
        color="gray.600"
        _dark={{ color: "gray.300" }}
      >
        <Text pt={2}>{payloadText}</Text>
        {foldable && <Text mt={1}>{folded ? "Show more" : "Show less"}</Text>}
      </Box>

      <Flex position="absolute" top={1} right={4} gap={2}>
        {paste.IsSensitive && (
          <IconButton
            size="md"
            aria-label="hide / show"
            variant="ghost"
            colorScheme="brand"
            onClick={() => setHidden((prev) => !prev)}
            icon={<Icon as={hidden ? FaEyeSlash : FaEye} boxSize={6} />}
          />
        )}
        <IconButton
          size="md"
          aria-label="copy"
          variant="ghost"
          colorScheme={hasCopied ? "green" : "brand"}
          onClick={onCopy}
          icon={<Icon as={hasCopied ? BsClipboardCheck : MdContentCopy} boxSize={6} />}
        />
        <Menu autoSelect={false}>
          <MenuButton
            as={IconButton}
            size="md"
            aria-label="Options"
            variant="ghost"
            colorScheme="brand"
            icon={<Icon as={MdMoreVert} boxSize={6} />}
          />
          <MenuList>
            <MenuItem onClick={onDelete} icon={<Icon as={MdDelete} boxSize={6} />}>
              Delete
            </MenuItem>
          </MenuList>
        </Menu>
      </Flex>
    </Box>
  );
}

export default PasteItem;
